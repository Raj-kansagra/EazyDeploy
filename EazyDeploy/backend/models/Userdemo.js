import mongoose from 'mongoose';
import cron from 'node-cron';

const ProjectSchema = new mongoose.Schema({
  github_link: {
    type: String,
    required: true,
  },
  project_id: {
    type: String,
    required: true,
  },
  isdeploying: {
    type: Boolean,
    default: false,
  },
  project_type : String,
  project_awslink: String,
  project_customlink: String,

  project_path: {
    type : String,
    default : null,
  },
  env: [
    {
      key: String,
      value: String,
    },
  ],
  logs: [
    {
      timestamp:String, 
      message: String, 
    },
  ],
});

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  dailylimit: {
    type: Number, 
    default: 3, 
  },
  isVerified: { type: Boolean, default: false },
  otp: String ,
  otpExpires : Date ,
  projects: [ProjectSchema],
});

cron.schedule('0 0 * * *', async () => {
  try {
    await Userdemo.updateMany({}, { dailylimit: 3 });
    console.log('Daily limit reset for all users');
  } catch (error) {
    console.error('Error resetting daily limit:', error);
  }
});


const Userdemo = mongoose.model('Userdemo', UserSchema);
export default Userdemo;
