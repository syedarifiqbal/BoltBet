-- rate_limit.lua
-- Redis-backed per-IP rate limiting using INCR + expire.
-- Host: redis-ephemeral:6379 (ephemeral Redis — data loss on restart is acceptable)
-- Key pattern: rate:ip:{remote_addr}
-- Fail-open: if Redis is unreachable, the request is allowed (availability > correctness).

local M = {}

function M.check(limit)
    local redis = require "resty.redis"
    local red = redis:new()
    red:set_timeout(20) -- 20ms — fail fast so we don't add latency to the request

    local ok, err = red:connect("redis-ephemeral", 6379)
    if not ok then
        -- Redis down → fail open: availability over correctness for rate limits
        ngx.log(ngx.WARN, "rate_limit: Redis unreachable, failing open: ", err)
        return
    end

    local key = "rate:ip:" .. ngx.var.remote_addr
    local count, err = red:incr(key)
    if not count then
        ngx.log(ngx.WARN, "rate_limit: INCR failed: ", err)
        red:set_keepalive(10000, 100)
        return
    end

    if count == 1 then
        -- First request in this window — set 60-second expiry
        red:expire(key, 60)
    end

    red:set_keepalive(10000, 100)

    if count > limit then
        ngx.header["Retry-After"] = "60"
        ngx.header["Content-Type"] = "application/json"
        ngx.status = 429
        ngx.say('{"error":"too_many_requests","message":"Rate limit exceeded. Try again in 60 seconds.","retry_after":60}')
        ngx.exit(429)
    end
end

return M
