'use strict'
const database = require('../utils/database')
const {
  stringIsAMatch,
  hashString,
  generateToken,
  validateToken
} = require('../utils/index')

module.exports = async function (fastify, opts) {
  const log = fastify.log

  fastify.route({
    url: '/api/user',
    method: 'GET',
    preHandler: validateToken,
    handler: async (req, reply) => {
      try {
        const user = await database("user").where({
          id: req.userId
        }).first();
        return {
          user: {
            email: user.email,
            username: user.username,
            token: user.token
          }
        }
      } catch (error) {
        log.error(error)
        reply.status(500).send({ message: 'Internal server error' })
      }
    }
  })

  fastify.route({
    url: '/api/users',
    method: 'POST',
    handler: async (req, reply) => {
      try {
        const
          username = req.body.user.username,
          email = req.body.user.email,
          password = await hashString(req.body.user.password),
          token = await generateToken();
        
          await database('user').insert({
            username,
            email,
            password,
            token,
          });
  
          return {
            user: {
              username,
              email,
              token
            }
          }
      } catch (error) {
        log.error(error)
        reply.status(500).send({ message: 'Internal server error' })
      }
    }
  })

  fastify.post('/api/users/login', async function (req, reply) {
    try {
      const { email, password } = req.body.user
      const user = await database('user').where({ email }).first()
      const equal = await stringIsAMatch(password, user.password)
      if (!equal) {
        reply.status(401)
        return {
          message: 'Invalid credentials'
        }
      }
      return {
        user: {
          username: user.username,
          token: user.token,
          email: user.email,
        }
      }
    } catch (error) {
      log.error(error)
      reply.status(500).send({ message: 'Internal server error' })
    }
  })

  fastify.put('/api/user', async (req, reply) => req.body)

  fastify.get('/api/profiles/:username', async (req, reply) => {
    const user = await database('user').select(['username', 'bio', 'image']).where({ username: req.params.username }).first()
    return {
      profile: user
    }
  })
}
