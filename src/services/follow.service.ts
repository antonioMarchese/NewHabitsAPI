import { prisma } from "../lib/prisma";
import { userService } from "./user.service";

export const followService = {
  toggleFollow: async (username: string, email: string) => {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        following: true,
      },
    });

    if (username === user!.username)
      throw new Error("Você não pode se seguir, bobão.");
    const followerUser = await userService.findByUsername(username);
    if (!followerUser) throw new Error("Usuário não encontrado.");

    const followingRelationship = await prisma.following.findUnique({
      where: {
        user_id_username: {
          username,
          user_id: user!.id,
        },
      },
    });

    if (followingRelationship) {
      await prisma.following.delete({
        where: {
          user_id_username: {
            user_id: user!.id,
            username,
          },
        },
      });

      await prisma.follower.delete({
        where: {
          user_id_username: {
            user_id: followerUser!.id,
            username: user!.username,
          },
        },
      });
    } else {
      await prisma.following.create({
        data: {
          user_id: user!.id,
          username,
        },
      }); // Follows the specified user

      await prisma.follower.create({
        data: {
          user_id: followerUser!.id,
          username: user!.username,
        },
      }); // Creates a follower for the user that has been followed
    }
  },
};
