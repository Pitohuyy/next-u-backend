'use strict'
const database = require('../utils/database');
const { stringIsAMatch, hashString, generateToken, validateToken } = require('../utils/index');

module.exports = async function (fastify, opts) {
  const log = fastify.log;

  // --- GET USER PROFILE ---
  fastify.route({
    url: '/api/user',
    method: 'GET',
    preHandler: validateToken,
    handler: async (req, reply) => {
      try {
        const user = await database('user').select(['email', 'username', 'token']).where({ id: req.userId }).first();
        if (!user) {
          reply.status(404).send({ message: 'User not found' });
          return;
        }
        reply.send({ user });
      } catch (err) {
        log.error(err);
        reply.status(500).send({ message: 'Internal server error' });
      }
    }
  });

  // --- SIGN UP ---
  fastify.route({
    url: '/api/users',
    method: 'POST',
    handler: async (req, reply) => {
      try {
        const { username, email, password } = req.body.user;
        const hashedPassword = await hashString(password);
        const token = await generateToken();

        const [userId] = await database('user').insert({
          username,
          email,
          password: hashedPassword,
          token
        }).returning('id');

        const newUser = {
          username,
          email,
          token
        };

        reply.send({ user: newUser });
      } catch (err) {
        log.error(err);
        reply.status(500).send({ message: 'Internal server error' });
      }
    }
  });

  // --- LOGIN ---
  fastify.post('/api/users/login', async function (req, reply) {
    const { email, password } = req.body.user;
    const user = await database('user').where({ email }).first();
    const equal = await stringIsAMatch(password, user.password);
    if (!equal) {
      reply.status(401);
      return {
        message: 'Invalid credentials'
      };
    }
    return {
      user: {
        username: user.username,
        token: user.token,
        email: user.email,
      }
    };
  });

  // --- do not modify ---
  fastify.put('/api/user', async (req, reply) => req.body);

  // --- do not modify ---
  fastify.get('/api/profiles/:username', async (req, reply) => {
    const user = await database('user').select(['username', 'bio', 'image']).where({ username: req.params.username }).first();
    return {
      profile: user
    };
  });
}
