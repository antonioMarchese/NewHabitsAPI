import dayjs from "dayjs";
import { Request, response, Response } from "express";
import { string, z } from "zod";
import { habitService } from "../services/habit.service";
import { userService } from "../services/user.service";
import { authController, AuthenticatedRequest } from "./auth.controller";

export const habitsController = {
  create: async (request: AuthenticatedRequest, reply: Response) => {
    await authController.checkToken(request, reply);

    try {
      const user = await userService.findByEmail(request.user!.email);

      const createHabitBody = z.object({
        title: z.string(),
        weekDays: z.array(z.number().min(0).max(6)),
      });

      const { title, weekDays } = createHabitBody.parse(request.body);

      await habitService.create({ user_id: user!.id, title, weekDays });
    } catch (error) {
      return reply.status(500).json({ mensagem: error });
    }

    return reply.status(201).send();
  },

  getAllHabits: async (req: AuthenticatedRequest, res: Response) => {
    await authController.checkToken(req, res); // Isso eu vou ter q melhorar em algum momento
    try {
      const email = req.user!.email;
      const user = await userService.findByEmail(email);
      const habits = await habitService.findAllUserHabits(user!.id);
      return res.status(200).json({
        habits,
      });
    } catch (error) {
      return res.status(400).json(error);
    }
  },

  update: async (req: AuthenticatedRequest, res: Response) => {
    const updateHabitsParams = z.object({
      title: z.string(),
      weekDays: z.array(z.number().min(0).max(6)),
    });
    await authController.checkToken(req, res); // Isso eu vou ter q melhorar em algum momento
    try {
      const { title, weekDays } = updateHabitsParams.parse(req.body);
      const { id } = req.params;
      const habit = await habitService.update(id, title, weekDays);

      return res.status(200).json(habit);
    } catch (error) {
      return res.status(400).json(error);
    }
  },

  show: async (request: AuthenticatedRequest, reply: Response) => {
    const getDayParams = z.object({
      date: z.coerce.date(),
    });

    await authController.checkToken(request, reply);
    try {
      const user = await userService.findByEmail(request.user!.email);

      const { date } = getDayParams.parse(request.query);
      const possibleHabits = await habitService.findPossibleHabits(
        date,
        user!.id
      );

      const completedHabits = await habitService.findCompletedHabits(
        date,
        user!.id
      );

      return reply.status(200).json({
        possibleHabits,
        completedHabits,
      });
    } catch (error) {
      return reply.status(400).json(error);
    }
  },

  toggle: async (request: AuthenticatedRequest, reply: Response) => {
    const toggleHabitParams = z.object({
      id: z.string().uuid(),
    });
    await authController.checkToken(request, reply);
    try {
      const { id } = toggleHabitParams.parse(request.params);

      const user = await userService.findByEmail(request.user!.email);
      await habitService.toggle(id, user!.id);
      return reply.status(200).send();
    } catch (error) {
      return reply.status(400).json(error);
    }
  },

  followSummary: async (request: AuthenticatedRequest, reply: Response) => {
    await authController.checkToken(request, reply);
    const getDayParams = z.object({
      date: z.coerce.date().optional(),
      username: z.string(),
    });
    try {
      const { date, username } = getDayParams.parse(request.query);

      const user = await userService.findByUsername(username);
      const user_id = user!.id;
      const monthSummary = await habitService.getUserMonthSummary(
        user_id,
        date
      );
      const month = date ? dayjs(date).month() : dayjs().month();
      return reply.status(201).json({
        month,
        monthSummary,
      });
    } catch (error) {
      return reply.status(400).json(error);
    }
  },

  monthSummary: async (request: AuthenticatedRequest, reply: Response) => {
    await authController.checkToken(request, reply);
    const getDayParams = z.object({
      date: z.coerce.date().optional(),
    });
    try {
      const user = await userService.findByEmail(request.user!.email);
      const { date } = getDayParams.parse(request.query);
      const user_id = user!.id;
      const monthSummary = await habitService.getUserMonthSummary(
        user_id,
        date
      );
      const month = date ? dayjs(date).month() : dayjs().month();
      return reply.status(201).json({
        month,
        monthSummary,
      });
    } catch (error) {
      return reply.status(500).json(error);
    }
  },

  delete: async (request: AuthenticatedRequest, reply: Response) => {
    const deleteHabitParams = z.object({
      id: z.string().uuid(),
    });

    await authController.checkToken(request, reply);
    try {
      const { id } = deleteHabitParams.parse(request.params);
      const user = await userService.findByEmail(request.user!.email);
      if (!user) return reply.status(401).json("Usuário não registrado");

      await habitService.deleteHabit(id, user.id);
      return reply.status(200).send();
    } catch (error) {
      return reply.status(400).json(error);
    }
  },

  habitInfo: async (request: AuthenticatedRequest, response: Response) => {
    await authController.checkToken(request, response);
    try {
      const { id } = request.params;
      const habit = await habitService.findById(id);
      return response.status(200).json(habit);
    } catch (error) {
      return response.status(400).json(error);
    }
  },

  weekInfo: async (request: AuthenticatedRequest, response: Response) => {
    const getDayParams = z.object({
      date: z.coerce.date(),
    });
    await authController.checkToken(request, response);
    try {
      const user = await userService.findByEmail(request.user!.email);

      const { date } = getDayParams.parse(request.query);
      const completedHabits = await habitService.getWeekCompleted(
        date,
        user!.id
      );
      return response.status(200).json({ completedHabits });
    } catch (error) {
      return response.status(400).json(error);
    }
  },
};
