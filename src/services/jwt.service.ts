import jwt from "jsonwebtoken";

const secret = "access-key";

export const jwtService = {
  signToken: (payload: string | object | Buffer, expiration: string) => {
    return jwt.sign(payload, secret, {
      expiresIn: expiration,
    });
  },

  verifyToken: (token: string, callbackfunc: jwt.VerifyCallback) => {
    jwt.verify(token, secret, callbackfunc);
  },
};
