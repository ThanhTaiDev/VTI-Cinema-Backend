const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const validateEmail = (email) => {
  return /\S+@\S+\.\S+/.test(email);
};

exports.register = async (data) => {
  const { name, email, phone, password } = data;
  if (!name) throw new Error('Name is required');
  if (!email || !validateEmail(email)) throw new Error('Email is invalid');
  if (!phone) throw new Error('Phone is required');
  if (!password || password.length < 6) throw new Error('Password too short');

  // check existing
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already exists');

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, phone, password: hash }
  });
  // hide password
  delete user.password;
  return user;
};

exports.login = async (data) => {
  const { email, password } = data;
  if (!email || !password) throw new Error('Email and password required');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Invalid credentials');
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'dev', { expiresIn: '1h' });
  return { accessToken: token };
};

exports.forgotPassword = async (data) => {
  // placeholder: in production send email with token
  return true;
};

exports.resetPassword = async (data) => {
  // placeholder: validate token and update password
  return true;
};
