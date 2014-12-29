var boom = require('boom')
var Pool = require('poolee')
var pool = null

exports.register = function (server, options, next) {
  pool = new Pool(
    require(options.insecure ? 'http' : 'https'),
    [options.host + ':' + (options.port || 443)],
    {
      keepAlive: options.keepAlive !== false,
      ping: '/__heartbeat__'
    }
  )
  server.auth.scheme('fxa-oauth', oauth)
  server.auth.strategy('fxa-oauth', 'fxa-oauth')
  return next()
}

exports.register.attributes = {
  pkg: require('./package.json')
}

function oauth(server, options) {
  return {
    authenticate: function (request, reply) {
      var auth = request.headers.authorization
      if (!auth || auth.indexOf('Bearer') !== 0) {
        return reply(boom.unauthorized('Bearer token not provided'))
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
            return reply(boom.serverTimeout(err.message))
          }
          try {
            var json = JSON.parse(body)
            if (json.code >= 400) {
              return reply(boom.unauthorized(json.message))
            }
            reply.continue({ credentials: json })
          }
          catch (e) {
            return reply(boom.serverTimeout(e.message))
          }
        }
      )
    }
  }
}
