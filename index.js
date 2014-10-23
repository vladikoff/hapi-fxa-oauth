var boom = require('boom')
var https = require('https')
var Pool = require('poolee')
var pool = null

exports.register = function (plugin, options, next) {
  pool = new Pool(
    https,
    [options.host + ':' + (options.port || 443)],
    {
      keepAlive: !!options.keepAlive,
      ping: '/__heartbeat__'
    }
  )
  plugin.auth.scheme('fxa-oauth', oauth)
  plugin.auth.strategy('fxa-oauth', 'fxa-oauth')
  return next()
}

exports.register.attributes = {
  pkg: require('./package.json')
}

function oauth(server, options) {
  return {
    authenticate: function (request, next) {
      var auth = request.headers.authorization
      if (!auth || auth.indexOf('Bearer') !== 0) {
        return next(boom.unauthorized('Bearer token not provided'))
      }
      var token = auth.split(' ')[1]
      pool.request(
        {
          method: 'POST',
          path: '/v1/verify',
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ token: token }),
        },
        function(err, resp, body) {
          if (err) {
            return next(boom.serverTimeout(err.message))
          }
          try {
            var json = JSON.parse(body)
            if (json.code >= 400) {
              return next(boom.unauthorized(json.message))
            }
            next(null, { credentials: json })
          }
          catch (e) {
            return next(boom.serverTimeout(e.message))
          }
        }
      )
    }
  }
}
