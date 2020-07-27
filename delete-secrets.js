const fs = require('fs');
const data = JSON.parse(fs.readFileSync(0, 'utf-8'));

data.SecretList.map((secret) => {
    console.log(Object.keys(secret.SecretVersionsToStages)[0]);
});
