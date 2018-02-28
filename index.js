/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var url = require('url')
var boom = require('boom')
var Pool = require('poolee')

exports.register = function (server, options, next) {
  server.auth.scheme('fxa-oauth', oauth)
  if (options) {
    server.auth.strategy('fxa-oauth', 'fxa-oauth', options)
  }
  return next()
}

exports.register.attributes = {
  pkg: require('./package.json')
}

function oauth(server, options) {
  // Callers can either specify the verification URL,
  // or the individual components as separate options.
  if (options.url) {
    var pUrl = url.parse(options.url)
    if(!options.host) {
      options.host = pUrl.hostname
    }
    if (!options.port) {
      if (pUrl.port) {
        options.port = parseInt(pUrl.port)
      } else {
        if (pUrl.protocol === 'http:') {
          options.port = 80
        }
      }
    }
    if(!options.path) {
      options.path = pUrl.path
    }
    if(!options.insecure) {
      if (pUrl.protocol === 'http:') {
        options.insecure = true
      }
    }
  }
  options.path = options.path || ''
  while (options.path.slice(-1) === '/') {
    options.path = options.path.slice(0, -1)
  }

  var pool = new Pool(
    require(options.insecure ? 'http' : 'https'),
    [options.host + ':' + (options.port || (options.insecure ? 80 : 443))],
    {
      keepAlive: options.keepAlive !== false,
      ping: '/__heartbeat__'
    }
  )

  var extra = options.extra || {}

  return {
    authenticate: function (request, reply) {
      var auth = request.headers.authorization
      if (!auth || auth.indexOf('Bearer') !== 0) {
        // This is the necessary incantation to tell hapi to try
        // the next auth stragegy in the series, if any.
        return reply(boom.unauthorized(null, 'fxa-oauth'))
      }
      var token = auth.split(' ')[1]
      var data = { token: token }
      for (var key in extra) {
        data[key] = extra[key]
      }

      pool.request(
        {
          method: 'POST',
          path: options.path + '/v1/verify',
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify(data),
        },
        function(err, resp, body) {
          if (err) {
            return reply(boom.serverUnavailable(err.message))
          }
          try {
            var json = JSON.parse(body)
            if (json.code >= 400) {
              return reply(boom.unauthorized(json.message))
            }
            reply.continue({ credentials: json })
          }
          catch (e) {
            return reply(boom.serverUnavailable(e.message))
          }
        }
      )
    }
  }
}
