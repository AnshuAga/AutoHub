const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  getBranchDetails,
  upsertBranchDetail,
} = require("../controllers/branchController");

router.get("/", protect, getBranchDetails);
router.put("/:branchName", protect, upsertBranchDetail);

module.exports = router;
