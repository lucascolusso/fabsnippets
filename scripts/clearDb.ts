
const { db } = require("../db");
const { votes, snippets } = require("../db/schema");

async function clearDatabase() {
  // Delete all votes first due to foreign key constraint
  await db.delete(votes);
  // Then delete all snippets
  await db.delete(snippets);
  console.log("Database cleared successfully");
}

clearDatabase()
  .catch(console.error)
  .finally(() => process.exit(0));
