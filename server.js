const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB ক্লাউড কানেকশন স্ট্রিং (আপনার রিয়েল লিংকটি এখানে সেট করা হলো)
const MONGO_URI = 'mongodb+srv://egpshomrat_db_user:62AKjIuYCyJvoXKm@cluster0.bgvuwix.mongodb.net/spanish_egp?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
.then(() => console.log('Database connected successfully!'))
.catch(err => console.error('Database connection error:', err));

// ইউজার স্কিমা ও মডেল (ডেটাবেজে ইউজার সংরক্ষণের জন্য)
const userSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    otp: { type: String }
});

const User = mongoose.model('User', userSchema);

// Nodemailer কনফিগারেশন (আপনার জিমেইল এবং অ্যাপ পাসওয়ার্ড সহ)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'egpshomrat@gmail.com',
        pass: 'qvjq nofg nmdi rcqd'
    }
});

// ওটিপি জেনারেটর (১০ ডিজিট)
function generateOTP() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// ১. সাইন-আপ রুট (ওটিপি পাঠানো এবং ডাটাবেজে পেন্ডিং সেভ করা)
app.post('/api/signup', async (req, res) => {
    try {
        const { companyName, username, email, password } = req.body;

        let existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser && existingUser.isVerified) {
            return res.json({ success: false, message: 'এই ইউজারনেম বা ইমেইল ইতিমধ্যে রেজিস্টার্ড আছে!' });
        }

        const otp = generateOTP();

        if (existingUser && !existingUser.isVerified) {
            existingUser.companyName = companyName;
            existingUser.password = password;
            existingUser.otp = otp;
            await existingUser.save();
        } else {
            const newUser = new User({ companyName, username, email, password, otp, isVerified: false });
            await newUser.save();
        }

        const mailOptions = {
            from: 'egpshomrat@gmail.com',
            to: email,
            subject: 'Spanish Egp Pro - Account Verification OTP',
            text: `আপনার Spanish Egp Pro সফটওয়্যারের ওটিপি কোড হলো: ${otp}. কোডটি কাউকেই শেয়ার করবেন না।`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'ওটিপি সফলভাবে আপনার ইমেইলে পাঠানো হয়েছে। ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।' });

    } catch (error) {
        console.error('Signup error:', error);
        res.json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে! আবার চেষ্টা করুন।' });
    }
});

// ২. ওটিপি ভেরিফিকেশন রুট
app.post('/api/verify-signup-otp', async (req, res) => {
    try {
        const { username, otp } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.json({ success: false, message: 'ইউজার পাওয়া যায়নি!' });
        }

        if (user.otp === otp) {
            user.isVerified = true;
            user.otp = null;
            await user.save();
            return res.json({ success: true, message: 'অ্যাকাউন্ট সফলভাবে ভেরিফাই ও অ্যাক্টিভেট হয়েছে!' });
        } else {
            return res.json({ success: false, message: 'ভুল ওটিপি কোড! আবার চেষ্টা করুন।' });
        }
    } catch (error) {
        console.error('OTP Verification error:', error);
        res.json({ success: false, message: 'ভেরিফিকেশনে সমস্যা হয়েছে!' });
    }
});

// ৩. সাইন-ইন রুট
app.post('/api/signin', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !user.isVerified || user.password !== password) {
            return res.json({ success: false, message: 'ভুল ইউজারনেম, পাসওয়ার্ড অথবা অ্যাকাউন্ট ভেরিফাই করা হয়নি!' });
        }

        res.json({ 
            success: true, 
            message: 'সফলভাবে লগইন হয়েছে!', 
            user: { username: user.username, companyName: user.companyName } 
        });
    } catch (error) {
        console.error('Signin error:', error);
        res.json({ success: false, message: 'লগইন করতে সমস্যা হয়েছে!' });
    }
});

// ক্লাউড প্ল্যাটফর্মের জন্য ডায়নামিক পোর্ট সেটআপ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});