import { router } from "./routes";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors()); // para que a API possa receber requisições de qualquer aplicação

app.use(express.json());
app.use(express.static("./public"));
app.use(express.urlencoded({ extended: true }));

app.use(router);

app.listen(
  process.env.PORT ? Number(process.env.PORT) : 3333,
  "0.0.0.0",
  () => {
    console.log(
      `Server running at ${process.env.PORT ? Number(process.env.PORT) : 3333}`
    );
  }
);
