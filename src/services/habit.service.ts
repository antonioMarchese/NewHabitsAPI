import dayjs from "dayjs";
import { prisma } from "../lib/prisma";

interface CreateHabitsProps {
  user_id: string;
  title: string;
  weekDays: number[];
}

export const habitService = {
  findById: async (id: string) => {
    const habit = await prisma.habit.findUnique({
      where: {
        id,
      },
      include: {
        weekDays: {
          select: {
            week_day: true,
          },
        },
      },
    });
    return habit;
  },
  create: async ({ user_id, title, weekDays }: CreateHabitsProps) => {
    const today = dayjs().startOf("day").toDate(); // starOf('day') zera as horas e minutos do dia

    await prisma.habit.create({
      data: {
        user_id,
        title,
        created_at: today,
        weekDays: {
          create: weekDays.map((day) => {
            return {
              week_day: day,
            };
          }),
        },
      },
    });

    let day = await prisma.day.findUnique({
      where: {
        date_user_id: {
          date: today,
          user_id,
        },
      },
    });

    if (!day) {
      day = await prisma.day.create({
        data: {
          date: today,
          user_id,
        },
      });
    }
  },

  findAllUserHabits: async (id: string) => {
    const habits = await prisma.habit.findMany({
      where: {
        user_id: id,
      },
      select: {
        id: true,
        title: true,
        weekDays: {
          select: {
            week_day: true,
          },
        },
      },
      orderBy: {
        title: "asc",
      },
    });

    return habits;
  },

  update: async (id: string, title: string, weekDays: number[]) => {
    // Deleta os dias de antes

    await prisma.habitWeekDays.deleteMany({
      where: {
        habit_id: id,
      },
    });

    const habit = await prisma.habit.update({
      where: {
        id,
      },
      data: {
        title,
        weekDays: {
          create: weekDays.map((day) => {
            return {
              week_day: day,
            };
          }),
        },
      },
    });

    return habit;
  },

  findPossibleHabits: async (date: Date, user_id: string) => {
    const parsedDate = dayjs(date).startOf("day");
    const weekDay = parsedDate.get("day");

    // Todos os habitos possíveis
    const possibleHabits = await prisma.habit.findMany({
      where: {
        user_id,
        created_at: {
          lte: date, // habitos criados com a data menor ou igual à data atual
        },
        OR: [
          {
            deleted_at: {
              gt: date,
            },
          },
          {
            deleted_at: null,
          },
        ],
        weekDays: {
          some: {
            week_day: weekDay,
          },
        },
      },
      select: {
        id: true,
        title: true,
        created_at: true,
      },
    });

    return possibleHabits;
  },
  findCompletedHabits: async (date: Date, user_id: string) => {
    const parsedDate = dayjs(date).startOf("day");
    const weekDay = parsedDate.get("day");
    // Habitos ja completados
    const day = await prisma.day.findUnique({
      where: {
        date_user_id: {
          date: parsedDate.toDate(),
          user_id,
        },
      },
      include: {
        dayHabits: true,
      },
    });

    const completedHabits =
      day?.dayHabits.map((dayHabit) => {
        return dayHabit.habit_id;
      }) ?? [];

    return completedHabits;
  },

  // id = habitId
  toggle: async (id: string, user_id: string, onDelete?: boolean) => {
    const today = dayjs().startOf("day").toDate();

    let day = await prisma.day.findUnique({
      where: {
        date_user_id: {
          date: today,
          user_id,
        },
      },
    });

    if (!day) {
      day = await prisma.day.create({
        data: {
          date: today,
          user_id,
        },
      });
    }

    const dayHabit = await prisma.dayHabit.findUnique({
      where: {
        day_id_habit_id: {
          day_id: day.id,
          habit_id: id,
        },
      },
    });

    // Removendo a marcação de completo
    if (dayHabit) {
      await prisma.dayHabit.delete({
        where: {
          id: dayHabit.id,
        },
      });
    } else {
      if (!onDelete) {
        // Completar o hábito
        await prisma.dayHabit.create({
          data: {
            day_id: day.id,
            habit_id: id,
          },
        });
      }
    }
  },

  getUserSummary: async (user_id: string) => {
    // [ { date: 17/01, amountPossible: 5, completed: 1 }, {date: 18/01, amoutPossible: 2, completed: 2}, {} ]
    // Para querys mais complexas é preciso escrever em SQL
    const summary = await prisma.$queryRaw`
    SELECT 
      D.id, 
      D.date,
      D.user_id,
      (
        SELECT
          cast(count(*) as float) 
        FROM day_habits DH
        WHERE DH.day_id = D.id
      ) as completed,
      (
        SELECT
          cast(count(*) as float)
        FROM habit_week_days HWD 
        JOIN habits H
          ON H.id = HWD.habit_id
        WHERE 
          HWD.week_day = cast(strftime('%w', D.date/1000.0, 'unixepoch') as int)
          AND H.created_at <= D.date
          AND H.user_id = ${user_id}
      ) as amount
    FROM days D
    WHERE 
      D.user_id = ${user_id}
    `;

    return summary;
  },

  getUserMonthSummary: async (user_id: string, date = new Date()) => {
    // [ { date: 17/01, amountPossible: 5, completed: 1 }, {date: 18/01, amoutPossible: 2, completed: 2}, {} ]
    const monthBeg = dayjs(date).startOf("month").toDate();
    const monthEnd = dayjs(date).endOf("month").toDate();
    // Para querys mais complexas é preciso escrever em SQL
    const summary = await prisma.$queryRaw`
    SELECT 
      D.id, 
      D.date,
      D.user_id,
      (
        SELECT
          cast(count(*) as float) 
        FROM day_habits DH
        WHERE DH.day_id = D.id
      ) as completed,
      (
        SELECT
          cast(count(*) as float)
        FROM habit_week_days HWD 
        JOIN habits H
          ON H.id = HWD.habit_id
        WHERE 
          HWD.week_day = CAST (EXTRACT (DOW FROM D.date) AS INTEGER)
          AND H.created_at <= D.date
          AND H.user_id = ${user_id}
      ) as amount
    FROM days D
    WHERE 
      D.user_id = ${user_id}
      AND D.date >= ${monthBeg}
      AND D.date <= ${monthEnd}
    `;

    return summary;
  },

  getWeekCompleted: async (date: Date, user_id: string) => {
    const parsedDate = dayjs(date).startOf("week").toDate();
    const weekEnd = dayjs(date).endOf("week").toDate();
    // Habitos ja completados
    const day = await prisma.day.findMany({
      where: {
        user_id,
        AND: [
          {
            date: {
              gte: parsedDate,
            },
          },
          {
            date: {
              lte: weekEnd,
            },
          },
        ],
      },
      include: {
        dayHabits: true,
      },
    });

    const completedHabits =
      day?.map((day) =>
        day.dayHabits.map((dayHabit) => {
          return dayHabit.habit_id;
        })
      ) ?? [];

    return completedHabits;
  },

  deleteHabit: async (habitId: string, userId: string) => {
    const today = dayjs().startOf("day").toDate();
    await habitService.toggle(habitId, userId, true);
    await prisma.habit.update({
      where: {
        id: habitId,
      },
      data: {
        deleted_at: today,
      },
    });
  },
};
