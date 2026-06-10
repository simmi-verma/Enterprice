const User = require("../models/User.js");
const Organization = require("../models/Organization.js");

const response = require("../../shared/utils/response.js");
const logger = require("../../shared/utils/logger.js");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

const generateTokens = (user, org) => {
	const payload = {
		userId: user._id,
		orgId: user.orgId,
		role: user.role,
		name: user.name,
		email: user.email,
		orgName: org?.name || "",
	};
	const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN || "24h",
	});

	const refreshToken = jwt.sign(
		{ userId: user._id, orgId: user.orgId },
		process.env.JWT_REFRESH_SECRET,
		{ expiresIn: "7d" },
	);

	return { accessToken, refreshToken };
};

const login = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty())
			return response(res, "Validation failed", 400, errors.array());

		const { email, password, orgSlug } = req.body;
		const orgFilter = {};
		if (orgSlug) {
			const org = await Organization.findOne({
				slug: orgSlug,
				isActive: true,
			});
			if (!org) return response.error(res, "Organization not found", 404);
			orgFilter.orgId = org._id;
		}
		const user = await User.findOne({
			email: email.toLowerCase(),
			isActive: true,
			...orgFilter,
		}).select("+password +refreshToken");

		if (!user) {
			return response.error(res, "Invalid email or password", 401);
		}
		const isMatch = await user.comparePassword(password);
		if (!isMatch) {
			return response.error(res, "Invalid email or password", 401);
		}
		const org = await Organization.findById(user.orgId).select(
			"name slug isActive",
		);
		if (!org || !org.isActive) {
			return response.error(
				res,
				"Organization is inactive. Contact support.",
				403,
			);
		}
		const { accessToken, refreshToken } = generateTokens(user, org);
		user.lastLogin = new Date();
		user.refreshToken = refreshToken;
		await user.save();
		logger.info(
			`✅ Login: ${user.email} | Org: ${org.name} | Role: ${user.role}`,
		);
		return response.success(
			res,
			{
				user,
				organization: { id: org._id, name: org.name, slug: org.slug },
				accessToken,
				refreshToken,
			},
			"Login successful",
		);
	} catch (err) {
		logger.error("Login error:", { error: err.message });
		return response.error(res, "Internal server error");
	}
};

// ── POST /auth/refresh ────────────────────────────────────
const refreshToken = async (req, res) => {
	try {
		const { refreshToken: token } = req.body;
		if (!token) return response.error(res, "Refresh token required ", 401);
		const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
		const user = await User.findById(decoded.userId).select("refreshToken");
		if (!user || user.refreshToken !== token) {
			return response.error(res, "Invalid refresh token", 403);
		}
		const org = await Organization.findById(user.orgId).select("name slug");
		const { accessToken, refreshToken: newRefresh } = generateTokens(
			user,
			org,
		);
		user.refreshToken = newRefresh;
		await user.save();

		return response.success(res, { accessToken, refreshToken: newRefresh });
	} catch (err) {
		return response.error(res, "Invalid or expired refresh token", 403);
	}
};

const logout = async (req, res) => {
	try {
		await User.findByIdAndUpdate(req.user.userId, { refreshToken });
		return response.success(res, null, "logged out successfully");
	} catch (err) {
		return response.error(res, "Internal server error");
	}
};

// Get /auth/me -- current user profile
const getMe = async (req, res) => {
	try {
		const user = await User.findById(req.user.userId).populate(
			"department",
			name,
		);
		if (!user) return response.error(res, "user not found", 404);
		return response.success(res, user);
	} catch (err) {
		return response.error(res, "Failed to fetch profile");
	}
};

// PUT /auth/me --Update own Profile
const updateMe = async (req, res) => {
	try {
		const allowed = ["name", "phone", "avatar", "jobTitles"];
		const update = {};
		allowed.forEach((f) => {
			if (req.body[f] != undefined) updata[f] = req.body[f];
		});
		const user = await User.findByIdAndUpdate(
			req.user.userId,
			{ $set: updates },
			{ new: true, runValidators: true },
		);
		return response.success(res, user, "Profile updated successfully");
	} catch (err) {
		return response.error(res, "Failed to update profile");
	}
};

const changePassword = async (req, res) => {
	try {
		const { currentPassword, newPassword } = req.body;
		const user = await User.findById(req.user.userId).select("+password");
		const isMatch = await user.comparePassword(currentPassword);

		if (!isMatch) {
			return response.error(res, "Current password is incorrect", 400);
		}

		user.password = newPassword;
		await user.save();

		return response.success(res, null, "Password changed successfully");
	} catch (err) {
		return response.error(res, "Failed to change password");
	}
};

module.exports = {
	login,
	refreshToken,
	logout,
	getMe,
	updateMe,
	changePassword,
};
