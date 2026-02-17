const validateRegistration = (/** @type {{ body: { userType: any; fullName: any; email: any; password: any; }; }} */ req, /** @type {{ status: (arg0: number) => { (): any; new (): any; json: { (arg0: { success: boolean; message: string; errors: string[]; }): any; new (): any; }; }; }} */ res, /** @type {() => void} */ next) => {
  const { userType, fullName, email, password } = req.body;
  const errors = [];

  // User type validation
  if (!userType || !["student", "employer"].includes(userType)) {
    errors.push("Invalid user type");
  }

  // Full name validation
  if (!fullName || fullName.trim().length < 2) {
    errors.push("Full name must be at least 2 characters long");
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push("Please provide a valid email address");
  }

  // Password validation
  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    );
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors,
    });
  }

  next();
};

module.exports = { validateRegistration };
