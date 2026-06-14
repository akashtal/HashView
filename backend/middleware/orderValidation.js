const Joi = require('joi');

exports.createOrderSchema = Joi.object({
  businessId: Joi.string().required(),
  customerName: Joi.string().max(100).required(),
  tableNumber: Joi.string().max(20).required(),
  numberOfPeople: Joi.number().min(1).max(50).required(),
  items: Joi.array().items(
    Joi.object({
      cartItemId: Joi.string().optional(),
      menuItem: Joi.object({
        _id: Joi.string().required()
      }).unknown(true).required(),
      quantity: Joi.number().min(1).required(),
      selectedModifiers: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          price: Joi.number().optional()
        }).unknown(true)
      ).optional(),
      selectedAddOns: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          price: Joi.number().optional()
        }).unknown(true)
      ).optional(),
      itemNotes: Joi.string().max(200).optional().allow(''),
      itemTotal: Joi.number().required()
    })
  ).min(1).required(),
  specialInstructions: Joi.string().max(500).optional().allow('')
});

exports.updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('accepted', 'preparing', 'ready', 'delivered', 'cancelled').required(),
  cancelReason: Joi.string().when('status', { is: 'cancelled', then: Joi.required(), otherwise: Joi.optional() })
});
