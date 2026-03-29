-- auth.lua
-- JWT blacklist check + auth result caching at the gateway edge.
-- 1. Extract Bearer token from Authorization header.
-- 2. Decode JWT payload to extract jti claim.
-- 3. Connect to persistent Redis (redis:6379) with 20ms timeout.
-- 4. If Redis unreachable: fall through to auth_request subrequest.
-- 5. Check blacklist:jti:{jti} — reject if found (token revoked).
-- 6. Check auth:cache:{jti} — if found, set user headers and short-circuit.
-- 7. If cache miss: subrequest to /internal/token/verify; on 200 set headers
--    and cache user object for 30s.

local M = {}

-- base64url → standard base64 → decoded string
local function base64url_decode(s)
    -- Replace URL-safe chars and add padding
    s = s:gsub("-", "+"):gsub("_", "/")
    local pad = #s % 4
    if pad == 2 then
        s = s .. "=="
    elseif pad == 3 then
        s = s .. "="
    end
    return ngx.decode_base64(s)
end

-- Extract jti from JWT payload (middle section)
local function extract_jti(token)
    local parts = {}
    for part in token:gmatch("[^.]+") do
        parts[#parts + 1] = part
    end
    if #parts ~= 3 then
        return nil, "malformed JWT: expected 3 parts, got " .. #parts
    end

    local payload_json = base64url_decode(parts[2])
    if not payload_json then
        return nil, "base64url decode failed"
    end

    local cjson = require "cjson.safe"
    local payload, decode_err = cjson.decode(payload_json)
    if not payload then
        return nil, "JSON decode failed: " .. (decode_err or "unknown")
    end

    if not payload.jti then
        return nil, "jti claim missing from token"
    end

    return payload.jti, nil
end

function M.check()
    -- 1. Extract Authorization header
    local auth_header = ngx.req.get_headers()["Authorization"]
    if not auth_header then
        ngx.status = 401
        ngx.header["Content-Type"] = "application/json"
        ngx.say('{"error":"unauthorized","message":"Authorization header is required."}')
        ngx.exit(401)
        return
    end

    local token = auth_header:match("^[Bb]earer%s+(.+)$")
    if not token then
        ngx.status = 401
        ngx.header["Content-Type"] = "application/json"
        ngx.say('{"error":"unauthorized","message":"Authorization header must be Bearer <token>."}')
        ngx.exit(401)
        return
    end

    -- 2. Decode JWT payload to get jti
    local jti, jti_err = extract_jti(token)
    if not jti then
        ngx.log(ngx.WARN, "auth: JWT parse error: ", jti_err)
        ngx.status = 401
        ngx.header["Content-Type"] = "application/json"
        ngx.say('{"error":"unauthorized","message":"Malformed token."}')
        ngx.exit(401)
        return
    end

    -- 3. Connect to persistent Redis (JWT blacklist + auth cache)
    local redis = require "resty.redis"
    local red = redis:new()
    red:set_timeout(20) -- 20ms — fail fast

    local ok, conn_err = red:connect("redis", 6379)
    if not ok then
        -- 4. Redis unreachable — fall through to auth_request subrequest
        ngx.log(ngx.WARN, "auth: Redis unreachable, falling through to subrequest: ", conn_err)
        -- Fall through to subrequest path below (no return here)
    else
        -- 5. Check blacklist
        local blacklisted, bl_err = red:get("blacklist:jti:" .. jti)
        if blacklisted and blacklisted ~= ngx.null then
            red:set_keepalive(10000, 100)
            ngx.status = 401
            ngx.header["Content-Type"] = "application/json"
            ngx.say('{"error":"token_revoked","message":"This session has been terminated."}')
            ngx.exit(401)
            return
        end

        -- 6. Check auth cache
        local cached, cache_err = red:get("auth:cache:" .. jti)
        if cached and cached ~= ngx.null then
            red:set_keepalive(10000, 100)
            local cjson = require "cjson.safe"
            local user, parse_err = cjson.decode(cached)
            if user then
                ngx.req.set_header("X-User-ID",   user.sub  or "")
                ngx.req.set_header("X-User-Tier",  user.tier or "")
                ngx.req.set_header("X-User-Role",  user.role or "")
                return -- Cache hit — skip subrequest
            else
                ngx.log(ngx.WARN, "auth: cache decode error: ", parse_err)
                -- Fall through to subrequest
            end
        end

        -- Cache miss — put connection back in pool, proceed to subrequest
        red:set_keepalive(10000, 100)
    end

    -- 7. Cache miss (or Redis down) — verify via internal subrequest
    local res = ngx.location.capture("/internal/token/verify", {
        method = ngx.HTTP_GET,
        copy_all_vars = false,
    })

    if res.status ~= 200 then
        ngx.status = 401
        ngx.header["Content-Type"] = "application/json"
        ngx.say('{"error":"unauthorized","message":"Token verification failed."}')
        ngx.exit(401)
        return
    end

    -- Read verified user headers from the identity service response
    local user_id   = res.header["X-User-ID"]   or ""
    local user_tier = res.header["X-User-Tier"]  or ""
    local user_role = res.header["X-User-Role"]  or ""

    ngx.req.set_header("X-User-ID",   user_id)
    ngx.req.set_header("X-User-Tier",  user_tier)
    ngx.req.set_header("X-User-Role",  user_role)

    -- Cache the result in Redis for 30 seconds (only if Redis is available)
    local red2 = redis:new()
    red2:set_timeout(20)
    local ok2 = red2:connect("redis", 6379)
    if ok2 then
        local cjson = require "cjson.safe"
        local user_obj = cjson.encode({
            sub  = user_id,
            tier = user_tier,
            role = user_role,
        })
        red2:setex("auth:cache:" .. jti, 30, user_obj)
        red2:set_keepalive(10000, 100)
    end
end

return M
