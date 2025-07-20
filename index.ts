import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

app.post("/github/webhook", (req, res) => {
  console.log("[Webhook received]", req.headers["x-github-event"]);
  res.status(200).send("Webhook received");
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
