const { stat } = require("fs");
const path = require("path");
const { isArray } = require("util");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function list(req, res, next) {
  res.json({ data: orders });
}

function read(req, res, next) {
  res.json({ data: res.locals.order });
}

function create(req, res, next) {
  let newId = nextId();
  const newOrder = {
    id: newId,
    ...res.locals.newOrder,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function update(req, res, next) {
  const newOrder = res.locals.newOrder;
  const orderIndex = orders.findIndex((order) => order.id == newOrder.id);
  orders[orderIndex] = newOrder;
  res.json({ data: newOrder });
}

function hasOrder(req, res, next) {
  const { orderId } = req.params;

  const foundOrder = orders.find((order) => order.id == orderId);
  const index = orders.findIndex((order) => order.id == orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    res.locals.index = index;
    return next();
  }
  next({
    status: 404,
    message: `order does not exist: ${orderId}.`,
  });
}
function hasDeliverTo(req, res, next) {
  const { data: order } = req.body;
  if (!order.deliverTo) {
    return next({ status: 400, message: "Order must include a deliverTo" });
  }
  res.locals.orderValidation = order;
  next();
}

function hasMobile(req, res, next) {
  const order = res.locals.orderValidation;
  if (!order.mobileNumber) {
    return next({ status: 400, message: "Order must include a mobileNumber" });
  }
  next();
}
function hasDishes(req, res, next) {
  const order = res.locals.orderValidation;
  if (
    !order.dishes ||
    order.dishes.length === 0 ||
    !Array.isArray(order.dishes)
  ) {
    return next({
      status: 400,
      message: "Order must include at least one dish",
    });
  }
  next();
}
function hasQuantity(req, res, next) {
  const order = res.locals.orderValidation;
  order.dishes.forEach((dish, index) => {
    if (
      !dish.quantity ||
      !Number.isInteger(dish.quantity) ||
      dish.quantity < 1
    ) {
      return next({
        status: 400,
        message: `Dish ${index} must have a quantity that is an integer greater than 0`,
      });
    }
  });
  next();
}

function postPropertiesAreValid(req, res, next) {
  res.locals.newOrder = res.locals.orderValidation;
  next();
}

function idCheck(req, res, next) {
  const { data: order } = req.body;
  const { orderId } = req.params;
  const newOrder = res.locals.orderValidation;
  if (order.id) {
    if (newOrder.id != orderId) {
      return next({
        status: 400,
        message: `Order id does not match route id. Order: ${order.id}, Route: ${orderId}.`,
      });
    }
  }
  next();
}
//ensure that status is pending if we are going to change the order
function statusCheck(req, res, next) {
  const order = res.locals.orderValidation;
  if (!order.status || order.status.length < 1 || order.status === "invalid") {
    return next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
    });
  } else if (order.status === "delivered") {
    return next({
      status: 400,
      message: `A delivered order cannot be changed`,
    });
  }
  next();
}
//sets id (only changes if its different form url id)
function updateIsValid(req, res, next) {
  const { orderId } = req.params;
  const newOrder = res.locals.orderValidation;
  newOrder.id = orderId;
  res.locals.newOrder = { ...newOrder };
  next();
}
function deleteValidation(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id == orderId);
  if (foundOrder.status !== "pending") {
    return next({
      status: 400,
      message: `An order cannot be deleted unless it is pending`,
    });
  }
  next();
}

function destroy(req, res, next) {
  const index = res.locals.index;
  if (index > -1) {
    orders.splice(index, 1);
  }
  res.sendStatus(204);
}

module.exports = {
  list,
  read: [hasOrder, read],
  create: [
    hasDeliverTo,
    hasMobile,
    hasDishes,
    hasQuantity,
    postPropertiesAreValid,
    create,
  ],
  update: [
    hasOrder,
    hasDeliverTo,
    hasMobile,
    hasDishes,
    hasQuantity,
    postPropertiesAreValid,
    idCheck,
    statusCheck,
    updateIsValid,
    update,
  ],
  delete: [hasOrder, deleteValidation, destroy],
};
