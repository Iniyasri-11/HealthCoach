const mongoose = require('mongoose');

const HealthRecordSchema = new mongoose.Schema({
    patientName: {
        type: String,
        required: true
    },
    originalData: {
        type: String,
        required: true
    },
    compressedData: {
        type: String,
        required: true
    },
    compressionRatio: {
        type: Number,
        required: true
    },
    recommendations: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('HealthRecord', HealthRecordSchema);
