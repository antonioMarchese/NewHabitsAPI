import express from "express";
import { userController } from "./controllers/user.controller";
import { habitsController } from "./controllers/habits.controller";
const router = express.Router();

// Rotas de usuários

router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/loginWithToken", userController.loginWithToken);
// Atualizar informações
router.put("/users/current", userController.update);
// Atualizar senha
router.put("/users/current/password", userController.updatePassword);
// Seguir ou parar de seguir um usuário
router.patch("/users/:username/follow", userController.followUser);
// Informações de seguidor
router.get("/users/:username/userinfo", userController.followerInfo);
// Pesquisa por usuários
router.get("/users/search", userController.search);
// Informações do usuário
router.get("/userinfo", userController.userinfo);
// Informações do usuário
router.get("/followinfo", userController.followInfo);

// ROtas de hábitos

// Criação de hábitos
router.post("/habits", habitsController.create);
// Informações do hábito
router.get("/habit/:id", habitsController.habitInfo);
// Todos os hábitos de um dia
router.get("/day", habitsController.show);
// completar / não-completar um hábito
router.patch("/habits/:id/toggle", habitsController.toggle);
// Relatórios de hábitos
router.get("/summary", habitsController.followSummary);
router.get("/weekSummary", habitsController.weekInfo);
router.get("/monthSummary", habitsController.monthSummary);
// GET todos os hábitos do usuário
router.get("/users/habits", habitsController.getAllHabits);
// Atualiza as informações de um determinado hábito
router.put("/users/habits/:id/update", habitsController.update);
// Deleta um certo hábito
router.delete("/habits/:id/delete", habitsController.delete);

export { router };
