const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const zlib = require('zlib');
const HealthRecord = require('./models/HealthRecord');
const User = require('./models/User');

// Simple In-Memory Contact Model for Demo (or could be MongoDB)
const ContactSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    date: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', ContactSchema);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from root

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/health_coach')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Helper: Simple Recommendation Engine (Rule-based)
function generateRecommendations(text) {
    const recommendations = [];
    const lowerText = text.toLowerCase();

    // Condition: Headache / Migraine
    if (lowerText.includes('headache') || lowerText.includes('migraine') || lowerText.includes('dizzy')) {
        recommendations.push('Stay hydrated and maintain a regular sleep schedule.');
        recommendations.push('Consider tracking triggers like stress, caffeine, or certain foods.');
        recommendations.push('Rest in a dark, quiet room if symptoms worsen.');
    }

    // Condition: Fever / Infection
    if (lowerText.includes('fever') || lowerText.includes('temperature') || lowerText.includes('chills') || lowerText.includes('sweat')) {
        recommendations.push('Monitor temperature regularly and stay cool.');
        recommendations.push('Consult a doctor if fever persists above 39°C (102°F) or lasts more than 3 days.');
        recommendations.push('Drink plenty of fluids to prevent dehydration.');
    }

    // Condition: Cardiovascular / BP
    if (lowerText.includes('pressure') || lowerText.includes('bp') || lowerText.includes('heart') || lowerText.includes('chest')) {
        recommendations.push('Reduce sodium intake and monitor blood pressure daily.');
        recommendations.push('Engage in moderate aerobic exercise like walking (at least 30 mins/day).');
        recommendations.push('Limit alcohol and avoid smoking.');
    }

    // Condition: Diabetes / Sugar
    if (lowerText.includes('sugar') || lowerText.includes('diabetes') || lowerText.includes('glucose') || lowerText.includes('thirsty')) {
        recommendations.push('Monitor blood glucose levels before and after meals.');
        recommendations.push('Focus on a low-glycemic index diet rich in vegetables and whole grains.');
        recommendations.push('Inspect feet daily for any cuts or sores.');
    }

    // Condition: Pain / Inflammation
    if (lowerText.includes('pain') || lowerText.includes('ache') || lowerText.includes('sore') || lowerText.includes('joint')) {
        recommendations.push('Rest the affected area and consider different posture or ergonomics.');
        recommendations.push('Apply ice for acute pain or heat for chronic muscle stiffness.');
    }

    // Condition: Respiratory / Breathing
    if (lowerText.includes('breath') || lowerText.includes('cough') || lowerText.includes('cold') || lowerText.includes('flu') || lowerText.includes('wheez')) {
        recommendations.push('Practice deep breathing exercises to improve lung capacity.');
        recommendations.push('Avoid pollutants and allergens; consider using an air purifier.');
        recommendations.push('Steam inhalation may help clear nasal passages.');
    }

    // Condition: Sleep / Fatigue
    if (lowerText.includes('sleep') || lowerText.includes('tired') || lowerText.includes('fatigue') || lowerText.includes('insomnia')) {
        recommendations.push('Establish a consistent bedtime routine and avoid screens before bed.');
        recommendations.push('Avoid caffeine and large meals in the evening.');
    }

    // Condition: Stomach / Digestion
    if (lowerText.includes('stomach') || lowerText.includes('nausea') || lowerText.includes('vomit') || lowerText.includes('diarrhea') || lowerText.includes('digest')) {
        recommendations.push('Stick to the BRAT diet (Bananas, Rice, Applesauce, Toast) for a few days.');
        recommendations.push('Avoid spicy, fatty, or fried foods.');
        recommendations.push('Stay hydrated with electrolyte-rich fluids.');
    }

    // Default Fallback (Add variety if no specific keywords match)
    if (recommendations.length === 0) {
        recommendations.push('Maintain a balanced diet rich in fruits, vegetables, and lean proteins.');
        recommendations.push('Schedule a general check-up to monitor overall health metrics.');
        recommendations.push('Aim for at least 7-8 hours of quality sleep each night.');
        recommendations.push('Stay active with at least 150 minutes of moderate activity per week.');
    }

    return recommendations;
}

// API Routes

// 0. Authentication
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const newUser = new User({ username, email, password });
        await newUser.save();
        res.json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        res.json({ success: true, message: 'Login successful', username: user.username });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Check if user has completed health assessment
app.post('/api/check-assessment', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user has a health assessment
        const hasAssessment = !!(user.healthAssessment && Object.keys(user.healthAssessment).length > 0);
        
        const responseObj = {
            success: true,
            hasAssessment: hasAssessment,
            assessment: hasAssessment ? user.healthAssessment : null
        };
        
        res.json(responseObj);
    } catch (err) {
        console.error('Assessment Check Error:', err);
        res.status(500).json({ error: 'Server error checking assessment' });
    }
});

app.post('/api/chat', (req, res) => {
    const { message, assessment } = req.body;
    if (!message) return res.json({ success: true, response: "I didn't catch that. Could you say it again?" });

    const lowerMsg = message.toLowerCase();
    let response = "I'm here to help! You can ask me about **diet**, **exercise**, **symptoms**, or **general wellness**.";

    // Build personalized knowledge base with assessment context
    const knowledgeBase = [
        // Greetings & Basics
        { keywords: ['hello', 'hi', 'hey', 'greetings', 'morning', 'evening', 'start'], response: "Hello! 👋 I'm your WellnessFlow Health Coach. How can I help you today?" },
        { keywords: ['who are you', 'what are you', 'your name', 'identify'], response: "I'm an AI-powered Health Coach designed to provide personalized wellness guidance based on your health assessment." },
        { keywords: ['thank', 'thanks', 'appreciate'], response: "You're welcome! Keep up the great work on your wellness journey! 🌿" },
        { keywords: ['bye', 'goodbye', 'see you', 'exit'], response: "Goodbye! Remember to stay hydrated and take care! 💚" },

        // Features
        { keywords: ['feature', 'capabilities', 'what can you do', 'help'], response: "I can help with:\n1. **Personalized Guidance**: Based on your assessment\n2. **Diet & Nutrition**: Food recommendations\n3. **Exercise Tips**: Fitness advice tailored to your level\n4. **Mental Wellness**: Stress management & sleep tips\n5. **Symptom Support**: Health concern guidance" },
        
        // Assessment-based responses
        { keywords: ['assessment', 'my health', 'results'], response: "Based on your assessment, I can provide targeted recommendations. What specific area would you like to focus on - exercise, nutrition, stress management, or sleep?" },

        // Symptoms - General
        { keywords: ['headache', 'migraine', 'head hurts', 'dizzy'], response: "For headaches, hydration is key. 💧 Rest in a dark, quiet room and try some deep breathing. If vision loss or severe pain occurs, consult a doctor immediately." },
        { keywords: ['fever', 'hot', 'temperature', 'chills'], response: "Monitor your temperature regularly. Stay hydrated and rest. If it exceeds 39°C (102°F) or lasts >3 days, contact your doctor." },
        { keywords: ['cold', 'flu', 'cough', 'sneeze', 'runny nose'], response: "Rest, increase fluids, and try this immune-boosting combo: Vitamin C, zinc, and ginger. Steam inhalation helps clear congestion." },
        { keywords: ['stomach', 'pain', 'ache', 'belly', 'nausea', 'vomit'], response: "Start with bland foods (BRAT: Bananas, Rice, Applesauce, Toast). Ginger tea or peppermint can help settle your stomach." },
        { keywords: ['tired', 'fatigue', 'exhausted', 'sleepy', 'insomnia'], response: "Fatigue often links to sleep quality, stress, or nutrition. Aim for 7-9 hours nightly, maintain a consistent schedule, and try relaxation techniques." },
        { keywords: ['pain', 'joint', 'muscle', 'back', 'ache'], response: "Try gentle stretching, yoga, or a massage. Use ice for new injuries (48 hours), then heat for chronic stiffness. Persistent pain warrants professional evaluation." },

        // Nutrition & Diet
        { keywords: ['diet', 'food', 'eat', 'nutrition', 'healthy', 'meal'], response: "A balanced plate:\n🥗 50% Vegetables & Fruits\n🥩 25% Lean Proteins (chicken, fish, tofu, legumes)\n🍞 25% Whole Grains\n💧 2L+ water daily" },
        { keywords: ['weight', 'lose', 'fat', 'slim', 'obesity'], response: "Sustainable weight loss = calorie deficit + regular exercise. Focus on nutrient-dense foods, not restriction. Aim for 0.5-1 kg/week loss." },
        { keywords: ['sugar', 'diabetes', 'sweet', 'glucose'], response: "Limit refined sugars & simple carbs. Choose complex carbs (oats, quinoa, brown rice) to maintain stable blood sugar levels." },
        { keywords: ['protein', 'muscle', 'gain', 'strength'], response: "Protein sources: Chicken, fish, eggs, tofu, lentils, yogurt. Combine with resistance training 2-3x/week for muscle gains." },
        { keywords: ['vegetarian', 'vegan', 'meat free'], response: "Great choices! Combine legumes + grains for complete proteins. Include nuts, seeds, soy products. Consider B12 supplementation if vegan." },

        // Activity Level personalization
        { keywords: ['exercise', 'workout', 'fitness', 'gym', 'cardio', 'activity'], response: "WHO recommends 150 min moderate activity/week. Start with daily 30-min walks - massive health benefits! Tailor intensity to your current fitness level." },
        { keywords: ['strength', 'lift', 'weights', 'muscle'], response: "Strength training 2-3x/week improves bone density & metabolism. Start light if new to it. Focus on major muscle groups for maximum benefit." },
        { keywords: ['lazy', 'sedentary', 'sit all day'], response: "Even small changes help! Start with short walks, desk stretches, or light home exercises. Build gradually to 150 min/week of activity." },

        // Mental Health
        { keywords: ['stress', 'anxiety', 'worried', 'nervous', 'panic', 'anxious'], response: "Try the 4-7-8 breathing: Inhale 4s, hold 7s, exhale 8s. Also effective: daily walks, meditation, or yoga. Regular exercise naturally reduces cortisol." },
        { keywords: ['sad', 'depressed', 'unhappy', 'low', 'mood'], response: "It's completely normal to feel down. Connect with loved ones, spend time in nature, or pursue hobbies. If persistent, professional support is valuable." },
        { keywords: ['sleep', 'bed', 'rest', 'insomnia', 'night'], response: "Sleep hygiene tips:\n- Consistent bedtime schedule\n- Avoid screens 1 hour before bed\n- Keep room cool & dark\n- Limit caffeine after 2 PM" },

        // Technical / Medical Data
        { keywords: ['compress', 'data', 'analyze'], response: "I help compress medical records for efficient storage using advanced algorithms. This keeps your data secure while saving space." }
    ];

    // Personalized response based on assessment
    if (assessment) {
        if (lowerMsg.includes('exercise') || lowerMsg.includes('workout') || lowerMsg.includes('activity')) {
            if (assessment.lifestyle === 'sedentary') {
                return res.json({ 
                    success: true, 
                    response: "Since you're currently sedentary, great first steps are:\n1. Start with 20-30 min daily walks\n2. Add light stretching (10 min/day)\n3. Aim for 3-4 days/week initially\n4. Gradually increase to 5+ days\n\nYour goal: Build to 150 min/week of moderate activity!" 
                });
            } else if (assessment.lifestyle === 'moderate') {
                return res.json({ 
                    success: true, 
                    response: "Great - you're moderately active! Next level:\n1. Increase to 5-6 days/week activity\n2. Add strength training (2x/week)\n3. Mix cardio with variety (walking, cycling, swimming)\n4. Consider fitness goals to stay motivated\n\nAim for 150+ min moderate activity/week!" 
                });
            }
        }

        if (lowerMsg.includes('sleep')) {
            if (assessment.sleep_hours < 6) {
                return res.json({ 
                    success: true, 
                    response: "You're getting only " + assessment.sleep_hours + " hours of sleep - that's below the recommended 7-9 hours. Priority improvements:\n1. Set a consistent bedtime (even weekends)\n2. Create a relaxing pre-sleep routine\n3. Limit caffeine after 2 PM\n4. Avoid screens 1 hour before bed\n5. Keep room cool and dark\n\nBetter sleep will boost immunity, mood, and energy!" 
                });
            }
        }

        if (lowerMsg.includes('stress')) {
            if (assessment.stress_level >= 8) {
                return res.json({ 
                    success: true, 
                    response: "Your stress level is high (" + assessment.stress_level + "/10). Let's address it:\n1. **Daily Practice**: 10-15 min meditation or yoga\n2. **Exercise**: Even 20 min walks reduce cortisol\n3. **Breathing**: 4-7-8 technique throughout the day\n4. **Social**: Connect with friends or family\n5. **Professional**: Consider a counselor if stress persists\n\nYou've got this! 💚" 
                });
            }
        }

        if (lowerMsg.includes('health') && lowerMsg.includes('improve')) {
            let recommendations = "Based on your assessment, here's your personalized wellness plan:\n\n";
            if (assessment.lifestyle === 'sedentary') recommendations += "✓ **Activity**: Start with 30-min daily walks\n";
            if (assessment.sleep_hours < 7) recommendations += "✓ **Sleep**: Aim for 7-9 hours nightly\n";
            if (assessment.stress_level >= 5) recommendations += "✓ **Stress**: Practice meditation or yoga\n";
            if (assessment.diet === 'poor') recommendations += "✓ **Nutrition**: Increase vegetables and whole grains\n";
            recommendations += "\nConsistent small changes lead to big results! Start with one area.";
            
            return res.json({ success: true, response: recommendations });
        }
    }

    // Simple Scoring Algorithm
    let bestMatch = null;
    let maxScore = 0;

    knowledgeBase.forEach(entry => {
        let score = 0;
        entry.keywords.forEach(word => {
            if (lowerMsg.includes(word)) score++;
        });
        if (score > maxScore) {
            maxScore = score;
            bestMatch = entry;
        }
    });

    if (bestMatch && maxScore > 0) {
        response = bestMatch.response;
    } else {
        // Fallback for generic queries
        if (lowerMsg.includes('?')) {
            response = "That's a great question! Try asking me about exercise, nutrition, stress, sleep, or specific health concerns.";
        } else {
            response = "I'm listening! Tell me more about what you'd like help with.";
        }
    }

    res.json({ success: true, response });
});

// 1. Process Health Data (Compress + Recommendations)
app.post('/api/process', async (req, res) => {
    try {
        const { patientName, healthData } = req.body;

        if (!patientName || !healthData) {
            return res.status(400).json({ error: 'Please provide patient name and health data.' });
        }

        // Simulating Compression using zlib (Deflate) - returning Base64 string
        // In a real medical app, we might use specialized DICOM compression or similar.
        const buffer = Buffer.from(healthData, 'utf-8');
        const compressedBuffer = zlib.deflateSync(buffer);
        const compressedString = compressedBuffer.toString('base64');

        // Calculate size reduction
        const originalSize = Buffer.byteLength(healthData, 'utf8');
        const compressedSize = compressedBuffer.length;
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

        // Generate Recommendations
        const recommendations = generateRecommendations(healthData);

        // Save to Database
        const newRecord = new HealthRecord({
            patientName,
            originalData: healthData,
            compressedData: compressedString,
            compressionRatio,
            recommendations
        });

        await newRecord.save();

        res.json({
            success: true,
            originalSize,
            compressedSize,
            compressionRatio,
            recommendations,
            recordId: newRecord._id
        });

    } catch (err) {
        console.error('Processing Error:', err);
        res.status(500).json({ error: 'Server Error processing data: ' + err.message });
    }
});

// 2. Get All Records
app.get('/api/records', async (req, res) => {
    try {
        const records = await HealthRecord.find().sort({ createdAt: -1 }).limit(10);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: 'Server Error fetching records.' });
    }
});

// 3. Contact Form Submission
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const newContact = new Contact({ name, email, message });
        await newContact.save(); // Save to MongoDB

        // In a real app, send email here using nodemailer
        console.log(`New Message from ${name}: ${message}`);

        res.json({ success: true, message: 'Message sent successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error sending message.' });
    }
});

// 4. Save Health Assessment
app.post('/api/save-assessment', async (req, res) => {
    try {
        const { email, assessment } = req.body;
        
        if (!email || !assessment) {
            return res.status(400).json({ error: 'Email and assessment data required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user with assessment data
        user.healthAssessment = {
            current_health: assessment.current_health,
            symptoms: assessment.symptoms,
            lifestyle: assessment.lifestyle,
            sleep_hours: assessment.sleep_hours,
            stress_level: assessment.stress_level,
            diet: assessment.diet,
            medical_history: assessment.medical_history,
            createdAt: new Date()
        };

        await user.save();
        res.json({ success: true, message: 'Assessment saved successfully' });
    } catch (err) {
        console.error('Assessment Save Error:', err);
        res.status(500).json({ error: 'Server error saving assessment' });
    }
});

// 5. Get Health Assessment
app.get('/api/get-assessment/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.healthAssessment) {
            return res.status(404).json({ error: 'No assessment found for this user' });
        }

        res.json({ success: true, assessment: user.healthAssessment });
    } catch (err) {
        console.error('Assessment Retrieval Error:', err);
        res.status(500).json({ error: 'Server error retrieving assessment' });
    }
});

// 6. Get Personalized Recommendations
app.post('/api/recommendations', (req, res) => {
    try {
        const { assessment } = req.body;
        
        if (!assessment) {
            return res.status(400).json({ error: 'Assessment data required' });
        }

        const recommendations = [];

        // Health status recommendations
        if (assessment.current_health === 'excellent') {
            recommendations.push('✓ Maintain your excellent health with consistent healthy habits');
        } else if (assessment.current_health === 'good') {
            recommendations.push('✓ Continue your good health journey - small improvements will push you to excellent');
        } else if (assessment.current_health === 'fair') {
            recommendations.push('⚠ Consider scheduling a consultation with a healthcare professional');
        } else {
            recommendations.push('⚠ Prioritize seeking medical advice for your health concerns');
        }

        // Sleep recommendations
        if (assessment.sleep_hours < 6) {
            recommendations.push('💤 Critical: Increase sleep to 7-9 hours per night for better health');
        } else if (assessment.sleep_hours >= 7 && assessment.sleep_hours <= 9) {
            recommendations.push('✓ Your sleep schedule is optimal - keep it consistent!');
        } else if (assessment.sleep_hours > 9) {
            recommendations.push('💤 You may be sleeping too much - aim for 7-9 hours');
        }

        // Activity recommendations
        if (assessment.lifestyle === 'sedentary') {
            recommendations.push('🏃 Start with 20-30 minutes of moderate daily exercise (walking, cycling, swimming)');
        } else if (assessment.lifestyle === 'moderate') {
            recommendations.push('✓ Try increasing exercise frequency to 5 days per week');
        } else if (assessment.lifestyle === 'very_active') {
            recommendations.push('✓ Great work! Consider strength training to vary your routine');
        }

        // Stress management
        if (assessment.stress_level >= 8) {
            recommendations.push('🧘 Practice daily meditation, yoga, or deep breathing for 10-15 minutes');
        } else if (assessment.stress_level >= 5) {
            recommendations.push('💆 Consider stress-reduction activities like walking outdoors or meditation');
        }

        // Diet recommendations
        if (assessment.diet === 'poor') {
            recommendations.push('🥗 Incorporate more fresh vegetables, fruits, and whole grains into your meals');
        } else if (assessment.diet === 'average') {
            recommendations.push('🥕 Increase intake of nutrient-dense foods like vegetables and proteins');
        } else if (assessment.diet === 'excellent') {
            recommendations.push('✓ Your diet looks great - keep up the healthy eating habits!');
        }

        // General wellness tips
        recommendations.push('💧 Stay hydrated - drink at least 8 glasses of water daily');
        recommendations.push('🎯 Set realistic health goals and track your progress weekly');
        recommendations.push('📱 Use our chatbot for daily wellness tips and motivation');

        res.json({ 
            success: true, 
            recommendations,
            personalizationLevel: assessment.current_health 
        });
    } catch (err) {
        console.error('Recommendations Error:', err);
        res.status(500).json({ error: 'Server error generating recommendations' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
