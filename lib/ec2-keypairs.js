const inquirer = require('inquirer');
const chalk = require('chalk');

const { exec } = require('./tooling/exec');
const { _clean } = require('./secrets');

const service = {
    async getKeyPairs() {
        const result = await exec(`aws ec2 describe-key-pairs --profile ${this.awsProfile} --region ${this.region}`);
        return JSON.parse(result.stdout);
    },
    prepareQuestion({ list }) {
        return `You are about to destroy ${list.length} EC2 key pairs in the following AWS region: ${this.region}\n
${chalk.redBright('This operation cannot be undone, therefore please proceed with caution!')} \n
----------------------------------------------------------\n
The following key pairs are to be permanently deleted:\n
        ${list.map(s => chalk.whiteBright(`${s.KeyName}`))}\n\n`;
    },
    async deleteKeyPair({ KeyName }) {
        return exec(`aws iam delete-key-pair --key-name ${KeyName} --profile ${this.awsProfile} --region ${this.region}`);
    },
    async _clean({ list }) {
        for (let i = 0; i < list.length; i++) {
            let item = list[i];

            console.log(`Deleting EC2 Key Pair ${chalk.white(item.KeyName)} (${i + 1} out of ${list.length})...`);
            const result = await this.deleteKeyPair({ KeyName: item.KeyName });
            if (result.exitCode === 0) {
                console.log(chalk.greenBright(`EC2 Key Pair ${item.KeyName} was deleted successfully!`));
            }
            console.log('');
        }

        console.log(chalk.greenBright(`Successfully deleted all ${list.length} EC2 Key Pairs!`));
    },
    async clean({ region, awsProfile, query = '', autoApprove = false }) {
        this.region = region;
        this.awsProfile = awsProfile;

        const { KeyPairs } = await this.getKeyPairs();

        let list = (query.length > 0) ? KeyPairs.filter(k => k.KeyName.indexOf(query) !== -1) :
            KeyPairs.filter(k => k.KeyName.indexOf('-deployer') !== -1);

        if (list.length === 0) {
            console.log(chalk.green('No key pairs found'));
        }

        if (!autoApprove) {
            console.log(this.prepareQuestion({ list }));

            inquirer.prompt([
                {
                    type: 'input',
                    name: 'confirm',
                    default: 'y',
                    message: `Proceed with destruction of ${list.length} EC2 Key Pairs?`
                }
            ]).then(async (answers) => {
                if (answers.confirm === 'y' || answers.confirm === 'Y' || answers.confirm === 'yes') {
                    await this._clean({ list });
                }
            });
        } else {
            await this._clean({ list });
        }
    }
};

module.exports = service;