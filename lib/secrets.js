const inquirer = require('inquirer');
const chalk = require('chalk');

const { exec } = require('./tooling/exec');

const service = {
    /**
     * Get all secrets per region and awsProfile using awscli
     */
    async getSecrets({ region, awsProfile = 'default' }) {
        const result = await exec(`aws secretsmanager list-secrets --profile ${awsProfile} --region ${region}`);
        return JSON.parse(result.stdout);
    },
    prepareQuestion({ list, region }) {
        return `You are about to destroy secrets in the following AWS region: ${region}\n
${chalk.redBright('This operation cannot be undone, therefore please proceed with caution!')} \n
----------------------------------------------------------\n
The following secrets are to be permanently deleted:\n
        ${list.map(s => chalk.whiteBright(`${s.Name}`))}\n\n`;
    },
    async destroySecret({ secretId, awsProfile, region }) {
        return exec(`aws secretsmanager delete-secret --secret-id ${secretId} --force-delete-without-recovery --profile ${awsProfile} --region ${region}`);
    },
    getSecretId(s) {
        //for (let key in s.SecretVersionsToStages) {
        //    if (s.SecretVersionsToStages[key].toString() === "AWSCURRENT") {
        //        return key;
        //    }
        //}

        return s.ARN;
    },
    async _clean({ list, awsProfile, region }) {
        for (let i = 0; i < list.length; i++) {
            let item = list[i];

            console.log(`Deleting secret ${chalk.white(item.Name)} (${i + 1} out of ${list.length})...`);
            const result = await this.destroySecret({ secretId: this.getSecretId(item), awsProfile, region });

            if (result.exitCode === 0) {
                console.log(chalk.greenBright(`Secret ${item.Name} was deleted successfully!`));
            }
        }

        console.log(chalk.greenBright(`Successfully deleted all ${list.length} secrets!`));
    },
    async clean({ region, awsProfile, query, autoApprove = false }) {
        const { SecretList } = await this.getSecrets({ region, awsProfile });
        const list = (query.length > 0) ? SecretList.filter(s => s.Name.indexOf(query) > -1) : SecretList;

        if (list.length === 0) {
            console.log(chalk.green('No secrets found'));
            return;
        }

        if (!autoApprove) {
            console.log(this.prepareQuestion({ list, region }));

            inquirer.prompt([
                {
                    type: 'input',
                    name: 'confirm',
                    default: 'y',
                    message: 'Proceed with destruction of the above secrets?'
                }
            ]).then(async (answers) => {
                if (answers.confirm === 'y' || answers.confirm === 'Y' || answers.confirm === 'yes') {
                    await this._clean({ list, awsProfile, region });
                }
            });
        } else {
            await this._clean({ list, awsProfile, region });
        }
    }
};

module.exports = service;