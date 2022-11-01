const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const checkingValidQueryParameters = (request, response, next) => {
  let {
    status = "",
    priority = "",
    search_q = "",
    category = "",
    dueDate = "",
  } = request.query;
  if (dueDate !== "") {
    const formatedDate = format(new Date(dueDate), "yyyy-MM-dd");
    const isDueDateValid = isValid(formatedDate);
  }
  const isStatusValid =
    (status = "") ||
    (status = "TO DO") ||
    (status = "IN PROGRESS") ||
    (status = "DONE");
  const isPriorityValid =
    (priority = "") ||
    (priority = "HIGH") ||
    (priority = "MEDIUM") ||
    (priority = "LOW");
  const isCategoryValid =
    (category = "") ||
    (category = "WORK") ||
    (category = "HOME") ||
    (category = "LEARNING");
  switch (true) {
    case isStatusValid === false:
      response.status(400);
      response.send("Invalid Todo Status");
      break;
    case isPriorityValid === false:
      response.status(400);
      response.send("Invalid Todo Priority");
      break;
    case isCategoryValid === false:
      response.status(400);
      response.send("Invalid Todo category");
      break;
    default:
      next();
      break;
  }
};

const changeToCamelCase = (element) => {
  //console.log(element);
  return {
    id: element.id,
    todo: element.todo,
    priority: element.priority,
    status: element.status,
    category: element.category,
    dueDate: element.due_date,
  };
};

// GET books list
app.get("/todos/", checkingValidQueryParameters, async (request, response) => {
  let {
    status = "",
    priority = "",
    search_q = "",
    category = "",
    dueDate = "",
  } = request.query;
  const getTodoQuery = `
            SELECT * FROM todo
            WHERE status LIKE '%${status}%'
                    AND priority LIKE '%${priority}%'
                    AND todo LIKE '%${search_q}%'
                    AND category LIKE '%${category}%';`;
  const dbResponse = await db.all(getTodoQuery);
  response.send(dbResponse.map((eachTodo) => changeToCamelCase(eachTodo)));
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const selectTodoByIdQuery = `
            SELECT * FROM todo
            WHERE id = ${todoId};`;
  const dbResponse = await db.get(selectTodoByIdQuery);
  response.send(changeToCamelCase(dbResponse));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const formatedDate = format(new Date(date), "yyyy-MM-dd");
  //console.log(date);
  const getTodoByDueDate = `
            SELECT * FROM todo
            WHERE due_date = '${formatedDate}';`;
  //console.log(getTodoByDueDate);
  const dbResponse = await db.all(getTodoByDueDate);
  response.send(dbResponse.map((eachTodo) => changeToCamelCase(eachTodo)));
});

app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = todoDetails;
  const formatedDate = format(new Date(dueDate), "yyyy-MM-dd");
  //console.log(formatedDate);
  const createTodoQuery = `
            INSERT INTO
                todo(id, todo, priority, status, category, due_date)
            VALUES (
                    ${id}, '${todo}', '${priority}', 
                    '${status}', '${category}', '${formatedDate}');`;
  //console.log(createTodoQuery);
  const result = await db.run(createTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    due_date = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category='${category}',
      due_date='${due_date}'
    WHERE
      id = ${todoId};`;

  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
            DELETE FROM todo
            WHERE id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;