import { User } from "@prisma/client";
import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { jwtService } from "../services/jwt.service";
import { userService } from "../services/user.service";

export interface AuthenticatedRequest extends Request {
  user?: { email: string } | null;
}

export const authController = {
  checkToken: async (request: AuthenticatedRequest, res: Response) => {
    const token = request.headers.authorization?.split(" ")[1];
    if (!token)
      return res
        .status(404)
        .json({ message: "Rota não autorizada: token não fornecido." });

    jwtService.verifyToken(token, async (err, decoded) => {
      if (err || typeof decoded === "undefined")
        return res
          .status(401)
          .json({ message: "Não autorizado: token inválido" });
      const userEmail = (decoded as JwtPayload).email;
      request.user = {
        email: userEmail,
      };
    });
  },
};
