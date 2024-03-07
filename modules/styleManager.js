const config = require('../config.json');

async function getEmbedColor(databaseManagerInstance){
    const selectQuery = 'SELECT id, name, value FROM settings WHERE name = ?';
    const selectValues = ['embed-color'];
    const databaseEmbedColors = await databaseManagerInstance.getSQLSelectorPromise(selectQuery, selectValues);
    if(databaseEmbedColors.length !== 1){
        const statementQuery = 'INSERT INTO settings (name, value) VALUES (?, ?)';
        await databaseManagerInstance.getSQLStatementPromise(statementQuery, 'embed-color', config.defaultEmbedColor);
        return config.defaultEmbedColor;
    }

    const selectedEmbedColor = databaseEmbedColors[0];

    return selectedEmbedColor.value;
}

module.exports = {
    getEmbedColor
}