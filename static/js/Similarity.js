const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'apartmentRental'
});

async function getApartmentVectors() {
    const [apartments] = await pool.query(`
        SELECT 
            a.ROOM_NO, 
            a.RENT_PER_MONTH,
            f.BEDROOMS,
            f.BATHROOMS,
            f.HAS_PARKING,
            f.HAS_INTERNET,
            f.FURNISHED,
            d.APT_TITLE,
            d.AREA
        FROM APARTMENT a
        JOIN APARTMENT_FEATURES f ON a.ROOM_NO = f.ROOM_NO
        JOIN APARTMENT_DETAILS d ON a.ROOM_NO = d.ROOM_NO
        WHERE a.APT_STATUS = 'AVAILABLE'
    `);

    return apartments.map(apt => ({
        id: apt.ROOM_NO,
        title: apt.APT_TITLE,
        vector: [
            apt.RENT_PER_MONTH / 1000,  
            apt.BEDROOMS,
            apt.BATHROOMS,
            apt.HAS_PARKING ? 1 : 0,
            apt.HAS_INTERNET ? 1 : 0,
            apt.FURNISHED ? 1 : 0,
            apt.AREA / 100  
        ]
    }));
}

function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must be of equal length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
}

async function getSimilarApartments(targetRoomNo, limit = 5) {
    const apartments = await getApartmentVectors();
    const targetApartment = apartments.find(apt => apt.id === targetRoomNo);

    if (!targetApartment) {
        throw new Error('Apartment not found');
    }
    const withScores = apartments.map(apt => ({
        ...apt,
        score: apt.id === targetRoomNo ? -1 : cosineSimilarity(targetApartment.vector, apt.vector)
    }));
    return withScores
        .filter(apt => apt.id !== targetRoomNo)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}
async function getUserWeightedSimilarities(userId, targetRoomNo, limit = 5) {
    const [preferences] = await pool.query(`
        SELECT PREFERENCE_TYPE, PREFERENCE_VALUE, WEIGHT 
        FROM USER_PREFERENCES 
        WHERE USER_ID = ?
    `, [userId]);

    const apartments = await getApartmentVectors();
    const targetApartment = apartments.find(apt => apt.id === targetRoomNo);

    if (!targetApartment) {
        throw new Error('Apartment not found');
    }

    const weights = new Array(targetApartment.vector.length).fill(1); 
    preferences.forEach(pref => {
        switch(pref.PREFERENCE_TYPE) {
            case 'AMENITY':
                if (pref.PREFERENCE_VALUE === 'PARKING') weights[3] = pref.WEIGHT;
                if (pref.PREFERENCE_VALUE === 'INTERNET') weights[4] = pref.WEIGHT;
                break;
            case 'BEDROOMS':
                weights[1] = pref.WEIGHT;
                break;
            case 'BATHROOMS':
                weights[2] = pref.WEIGHT;
                break;
            case 'FURNISHED':
                weights[5] = pref.WEIGHT;
                break;
            case 'BUDGET':
                weights[0] = pref.WEIGHT;
                break;
            case 'AREA':
                weights[6] = pref.WEIGHT;
                break;
        }
    });

    const withScores = apartments.map(apt => {
        if (apt.id === targetRoomNo) return { ...apt, score: -1 };
        const weightedTarget = targetApartment.vector.map((val, i) => val * weights[i]);
        const weightedApt = apt.vector.map((val, i) => val * weights[i]);
        
        return {
            ...apt,
            score: cosineSimilarity(weightedTarget, weightedApt)
        };
    });

    return withScores
        .filter(apt => apt.id !== targetRoomNo)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}


(async () => {
    try {
        const similar = await getSimilarApartments(101, 3);
        console.log('Similar apartments:');
        similar.forEach(apt => {
            console.log(`${apt.title} (Room ${apt.id}) - Similarity: ${apt.score.toFixed(3)}`);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
})();