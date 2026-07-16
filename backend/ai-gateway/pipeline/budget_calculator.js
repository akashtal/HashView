/**
 * Budget Calculator
 *
 * Provides multi-item budget analysis for queries like:
 *   "Can I get chicken fried rice, beef curry, and a coke for under £20?"
 *
 * Used by context_loader.js when budget + multi-item intent is detected.
 *
 * Functions:
 *   calculateMenuTotal    — Find items by name and sum their prices
 *   findAffordableCombos  — Check if given items fit within a budget
 *   suggestAlternatives   — Suggest cheaper substitutes if over budget
 *   buildBudgetContext    — Format budget analysis as context text for AI
 */

const mongoose = require('mongoose');

/**
 * Find menu items by name and calculate total price.
 *
 * @param {string} businessId     - Business to search within
 * @param {string[]} itemNames    - Names of items to find and sum
 * @returns {Promise<Object>} - { items: [{name, price, found}], total, allFound, isAffordable }
 */
async function calculateMenuTotal(businessId, itemNames) {
  if (!businessId || !itemNames || itemNames.length === 0) {
    return { items: [], total: 0, allFound: false, missing: [] };
  }

  const MenuItem = mongoose.model('MenuItem');

  const foundItems = [];
  const missing = [];

  for (const targetName of itemNames) {
    // Try exact name match first, then partial
    const nameRegex = new RegExp(escapeRegex(targetName), 'i');

    const item = await MenuItem.findOne({
      business: businessId,
      status: 'active',
      $or: [
        { name:        { $regex: nameRegex } },
        { tags:        { $elemMatch: { $regex: nameRegex } } },
        { description: { $regex: nameRegex } },
      ],
    })
      .select('name price currency')
      .lean();

    if (item && item.price > 0) {
      foundItems.push({
        name:     item.name,
        searched: targetName,
        price:    item.price,
        currency: item.currency || 'GBP',
        found:    true,
      });
    } else if (item && item.price === 0) {
      foundItems.push({
        name:     item.name,
        searched: targetName,
        price:    null,
        currency: 'GBP',
        found:    true,
        priceAvailable: false,
      });
      missing.push(targetName);
    } else {
      missing.push(targetName);
      foundItems.push({
        name:     targetName,
        searched: targetName,
        price:    null,
        currency: 'GBP',
        found:    false,
      });
    }
  }

  const pricedItems = foundItems.filter(i => i.price != null && i.price > 0);
  const total = pricedItems.reduce((sum, item) => sum + item.price, 0);
  const allFound = missing.length === 0;

  return {
    items:    foundItems,
    total:    Math.round(total * 100) / 100,
    allFound,
    missing,
    currency: 'GBP',
  };
}

/**
 * Check if given items fit within a budget at a specific business.
 *
 * @param {string}   businessId  - Business to check
 * @param {string[]} itemNames   - Names of items to find
 * @param {number}   budget      - Total budget in GBP
 * @returns {Promise<Object>}
 */
async function findAffordableCombos(businessId, itemNames, budget) {
  const result = await calculateMenuTotal(businessId, itemNames);

  if (!result.allFound || result.missing.length > 0) {
    return {
      ...result,
      isAffordable: null, // Cannot determine — some items not found
      budgetRemaining: null,
      verdict: 'incomplete',
      message: `Cannot calculate total — ${result.missing.join(', ')} not found on menu`,
    };
  }

  const isAffordable = result.total <= budget;
  const budgetRemaining = Math.round((budget - result.total) * 100) / 100;

  return {
    ...result,
    isAffordable,
    budget,
    budgetRemaining,
    verdict: isAffordable ? 'affordable' : 'over_budget',
    overspend: isAffordable ? 0 : Math.round((result.total - budget) * 100) / 100,
    message: isAffordable
      ? `Yes! All items total £${result.total.toFixed(2)} — £${Math.abs(budgetRemaining).toFixed(2)} under budget`
      : `Over budget by £${(result.total - budget).toFixed(2)} — total is £${result.total.toFixed(2)} vs budget £${budget.toFixed(2)}`,
  };
}

/**
 * If a combo is over budget, suggest cheaper alternatives for the most expensive items.
 *
 * @param {string}   businessId  - Business to search
 * @param {string[]} itemNames   - Original items requested
 * @param {number}   budget      - Total budget
 * @returns {Promise<Object>}
 */
async function suggestAlternatives(businessId, itemNames, budget) {
  const MenuItem = mongoose.model('MenuItem');

  // Find cheapest items in similar categories as the original request
  const alternativeResults = [];
  for (const targetName of itemNames) {
    // Get category of original item
    const nameRegex = new RegExp(escapeRegex(targetName), 'i');
    const original = await MenuItem.findOne({
      business: businessId,
      status:   'active',
      $or: [{ name: { $regex: nameRegex } }, { tags: { $elemMatch: { $regex: nameRegex } } }],
    }).select('name price menuCategory').lean();

    if (!original) continue;

    const perItemBudget = budget / itemNames.length;

    // Find cheaper alternative in same category
    if (original.price > perItemBudget && original.menuCategory) {
      const cheaper = await MenuItem.findOne({
        business:     businessId,
        status:       'active',
        menuCategory: original.menuCategory,
        price:        { $lt: original.price, $gt: 0 },
      })
        .sort({ price: -1 }) // Most expensive within the cheaper range
        .select('name price')
        .lean();

      if (cheaper) {
        alternativeResults.push({
          original:    { name: original.name, price: original.price },
          alternative: { name: cheaper.name, price: cheaper.price },
          savings:     Math.round((original.price - cheaper.price) * 100) / 100,
        });
      }
    }
  }

  return { alternatives: alternativeResults };
}

/**
 * Build formatted context text for the AI about budget analysis.
 * This is injected into the chat system prompt context.
 *
 * @param {string}   businessName - Name of the business
 * @param {string[]} itemNames    - Items the user asked about
 * @param {number}   budget       - User's budget
 * @param {Object}   result       - Result from findAffordableCombos
 * @returns {string}
 */
function buildBudgetContext(businessName, itemNames, budget, result) {
  const lines = [`BUDGET ANALYSIS for ${businessName}:`];
  lines.push(`User budget: £${budget.toFixed(2)}`);
  lines.push(`Items requested: ${itemNames.join(', ')}`);
  lines.push('');

  if (result.items && result.items.length > 0) {
    lines.push('Item prices found:');
    for (const item of result.items) {
      if (item.found && item.price != null) {
        lines.push(`  - ${item.name}: £${item.price.toFixed(2)}`);
      } else if (item.found && item.price == null) {
        lines.push(`  - ${item.name}: Price not listed in database`);
      } else {
        lines.push(`  - "${item.searched}": NOT FOUND on menu`);
      }
    }
  }

  if (result.allFound && result.missing.length === 0) {
    lines.push('');
    lines.push(`Total: £${result.total.toFixed(2)}`);
    if (result.isAffordable === true) {
      lines.push(`Verdict: AFFORDABLE — £${Math.abs(result.budgetRemaining).toFixed(2)} remaining`);
    } else if (result.isAffordable === false) {
      lines.push(`Verdict: OVER BUDGET by £${result.overspend.toFixed(2)}`);
    }
  } else if (result.missing.length > 0) {
    lines.push('');
    lines.push(`Cannot calculate total: ${result.missing.join(', ')} not found on menu`);
    if (result.total > 0) {
      const pricedItems = result.items.filter(i => i.price != null && i.price > 0);
      lines.push(`Partial total (for found items only): £${result.total.toFixed(2)}`);
    }
  }

  return lines.join('\n');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  calculateMenuTotal,
  findAffordableCombos,
  suggestAlternatives,
  buildBudgetContext,
};
