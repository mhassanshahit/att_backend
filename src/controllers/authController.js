const bcrypt = require('bcrypt');
const prisma = require('../prisma/client');
const { signAccessToken } = require('../utils/jwtUtils');

// Hardcoded user credentials
const HARDCODED_USERS = {
  'sultanranait@gmail.com': {
    admin: {
      password: 'Admin123',
      role: 'ADMIN',
      id: '666666666666666666666999',
      email: 'sultanranait@gmail.com'
    },
    user: {
      password: 'User123',
      role: 'USER',
      id: '666666666666666666666998',
      email: 'sultanranait@gmail.com'
    }
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password required' 
      });
    }

    // Check hardcoded credentials first
    const hardcodedUser = HARDCODED_USERS[email];
    if (hardcodedUser) {
      let userData = null;
      
      // Check admin credentials
      if (password === hardcodedUser.admin.password) {
        userData = hardcodedUser.admin;
      }
      // Check user credentials
      else if (password === hardcodedUser.user.password) {
        userData = hardcodedUser.user;
      }

      if (userData) {
        // Generate access token for hardcoded user
        const accessToken = signAccessToken({ 
          id: userData.id, 
          email: userData.email, 
          role: userData.role 
        });

        return res.json({
          success: true,
          user: {
            id: userData.id,
            email: userData.email,
            role: userData.role,
            createdAt: new Date()
          },
          accessToken
        });
      } else {
        // Hardcoded user exists but password is wrong
        return res.status(401).json({ 
          success: false,
          message: 'Invalid credentials' 
        });
      }
    }

    // Fall back to database authentication for non-hardcoded users
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employees: true }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const accessToken = signAccessToken({ 
      id: user.id, 
      email: user.email, 
      role: user.role 
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      accessToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

exports.logout = async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

exports.me = async (req, res) => {
  try {
    // Check if this is a hardcoded user
    const isHardcodedUser = Object.values(HARDCODED_USERS).some(
      users => users.admin.id === req.user.id || users.user.id === req.user.id
    );
    
    if (isHardcodedUser) {
      // Find the specific hardcoded user data
      let userData = null;
      for (const users of Object.values(HARDCODED_USERS)) {
        if (users.admin.id === req.user.id) {
          userData = users.admin;
          break;
        } else if (users.user.id === req.user.id) {
          userData = users.user;
          break;
        }
      }
      
      if (userData) {
        return res.json({
          success: true,
          user: {
            id: userData.id,
            email: userData.email,
            role: userData.role,
            createdAt: new Date(),
            employees: []
          }
        });
      }
    }

    // Regular database user lookup
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { 
        employees: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        employees: user.employees
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};
