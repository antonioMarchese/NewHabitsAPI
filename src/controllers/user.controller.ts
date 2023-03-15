/* import { Response, Request } from "fastify"; */
import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { jwtService } from "../services/jwt.service";
import { userService } from "../services/user.service";
import { authController, AuthenticatedRequest } from "./auth.controller";
import { prisma } from "../lib/prisma";
import { followService } from "../services/follow.service";
import { JwtPayload } from "jsonwebtoken";

export const userController = {
  // POST /register
  register: async (request: Request, res: Response) => {
    const userBody = z.object({
      username: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      email: z.string(),
      phone: z.string(),
      password: z.string(),
      avatar: z.string(),
    });

    try {
      const {
        username,
        first_name,
        last_name,
        phone,
        email,
        password,
        avatar,
      } = userBody.parse(request.body);

      const userAlredyExists = await userService.findByEmail(
        email.toLowerCase()
      );
      const usernameAlredyExists = await userService.findByUsername(username);

      if (userAlredyExists)
        return res.status(400).json({ message: "Email ja cadastrado." });
      if (usernameAlredyExists)
        return res
          .status(402)
          .json({ message: "Nome de usuário indisponível." });

      const user = await userService.create({
        username,
        firstName: first_name,
        lastName: last_name,
        email: email.toLowerCase(),
        phone,
        password,
        avatar,
      });

      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof Error)
        return res.status(400).json({ message: error.message });
    }
  },

  // POST /login
  login: async (req: Request, res: Response) => {
    const userBody = z.object({
      email: z.string(),
      password: z.string(),
    });

    const { email, password } = userBody.parse(req.body);
    try {
      // Checks if the user exists
      const user = await userService.findByEmail(email.toLowerCase());
      if (!user) return res.status(404).send("Usuário não cadastrado.");

      // Checks if the passwords match
      const isSame = await bcrypt.compare(password, user.password);
      if (!isSame) return res.status(401).send({ mensagem: "Senha inválida." });

      const payload = {
        id: user.id,
        firstName: user.first_name,
        email: user.email,
      };

      const token = jwtService.signToken(payload, "1d");

      return res.status(200).json({ authenticated: true, ...payload, token });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
    }
  },

  // POST /loginWithToken
  loginWithToken: async (request: Request, res: Response) => {
    const { token } = request.body;

    jwtService.verifyToken(token, async (err, decoded) => {
      if (err || typeof decoded === "undefined")
        return res
          .status(401)
          .json({ message: "Não autorizado: token inválido" });

      const email = (decoded as JwtPayload).email;
      const user = await userService.findByEmail(email);
      if (!user)
        return res
          .status(401)
          .json({ message: "Não autorizado: token inválido" });
      try {
        const payload = {
          id: user.id,
          firstName: user.first_name,
          email: user.email,
        };

        const token = jwtService.signToken(payload, "1d");

        return res.status(200).send({ authenticated: true, ...payload, token });
      } catch (error) {
        return res.status(500).json(error);
      }
    });
  },

  // GET /userinfo
  userinfo: async (request: AuthenticatedRequest, res: Response) => {
    await authController.checkToken(request, res);

    try {
      const user = await prisma.user.findUnique({
        where: {
          email: request.user!.email,
        },
        select: {
          username: true,
          first_name: true,
          last_name: true,
          phone: true,
          email: true,
          created_at: true,
          avatar: true,
          followers: {
            select: {
              username: true,
            },
          },
          following: {
            select: {
              username: true,
            },
          },
        },
      });
      return res.status(200).send(user);
    } catch (error) {
      return res.status(500).send(error);
    }
  },

  // GET /followerinfo
  followerInfo: async (request: Request, res: Response) => {
    try {
      const { username } = request.params;
      const user = await prisma.user.findUnique({
        where: {
          username,
        },
        select: {
          username: true,
          first_name: true,
          last_name: true,
          created_at: true,
          avatar: true,
          followers: {
            select: {
              username: true,
            },
          },
          following: {
            select: {
              username: true,
            },
          },
        },
      });
      if (!user)
        return res.status(404).json({ erro: "Usuário não encontrado." });
      return res.status(200).send(user);
    } catch (error) {
      return res.status(500).send(error);
    }
  },

  followInfo: async (request: AuthenticatedRequest, res: Response) => {
    await authController.checkToken(request, res);

    try {
      const user = await prisma.user.findUnique({
        where: {
          email: request.user!.email,
        },
        select: {
          followers: {
            select: {
              username: true,
            },
          },
          following: {
            select: {
              username: true,
            },
          },
        },
      });
      return res.status(200).send(user);
    } catch (error) {
      return res.status(500).send(error);
    }
  },

  update: async (req: AuthenticatedRequest, res: Response) => {
    await authController.checkToken(req, res);

    const userEmail = req.user!.email;
    const user = await userService.findByEmail(userEmail);
    const userId = user!.id;
    const { username, firstName, lastName, phone, email, avatar } = req.body;

    if (userEmail !== email) {
      const emailAlredyInUse = await userService.findByEmail(email);
      if (emailAlredyInUse)
        return res.status(401).json({
          Erro: "Este email não está disponível. Escolha outro ou mantenha o seu atual.",
        });
    }

    if (username !== user!.username) {
      const usernameAlredyInUse = await userService.findByUsername(username);
      if (usernameAlredyInUse)
        return res.status(401).json({
          Erro: "Nome de usuário indisponível. Escolha outro ou continue com o seu.",
        });
    }

    try {
      const updatedUser = await userService.update(userId, {
        username,
        email,
        firstName,
        lastName,
        phone,
        avatar,
      });

      return res.status(200).json(updatedUser);
    } catch (error) {
      if (error instanceof Error)
        return res.status(400).send({ message: error.message });
      return res.status(500).send(error);
    }
  },

  updatePassword: async (request: AuthenticatedRequest, response: Response) => {
    await authController.checkToken(request, response);
    const updatePasswordBody = z.object({
      password: z.string(),
      newPassword: z.string(),
    });
    try {
      const { password, newPassword } = updatePasswordBody.parse(request.body);
      const user = await userService.findByEmail(request.user!.email);

      // Checks if the passwords match
      const isSame = await bcrypt.compare(password, user!.password);
      if (!isSame)
        return response.status(401).send({ Erro: "Senha incorreta." });

      await userService.updatePassword(user!.id, newPassword);
      return response.status(200).send();
    } catch (error) {
      return response.status(400).json(error);
    }
  },

  followUser: async (request: AuthenticatedRequest, response: Response) => {
    await authController.checkToken(request, response);

    try {
      const { username } = request.params;
      await followService.toggleFollow(username, request.user!.email);
      return response.status(200).send();
    } catch (error) {
      return response.status(400).json(error);
    }
  },

  search: async (request: AuthenticatedRequest, response: Response) => {
    await authController.checkToken(request, response);
    try {
      const users = await userService.search();
      return response.status(200).json({
        users,
      });
    } catch (error) {
      return response.status(400).json(error);
    }
  },
};
