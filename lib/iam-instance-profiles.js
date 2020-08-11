const inquirer = require('inquirer');
const chalk = require('chalk');

const region = 'us-east-1';
const awsProfile = 'ci';

const { exec } = require('./tooling/exec');
const { _clean } = require('./secrets');

const service = {
    async getInstanceProfiles({ region, awsProfile = 'default' }) {
        const result = await exec(`aws iam list-instance-profiles --profile ${awsProfile} --region ${region}`);
        return JSON.parse(result.stdout);
    },
    prepareQuestion({ list, region }) {
        return `You are about to destroy ${list.length} IAM Instance Profiles in the following AWS region: ${region}\n
${chalk.redBright('This operation cannot be undone, therefore please proceed with caution!')} \n
----------------------------------------------------------\n
The following instance profiles are to be permanently deleted:\n
        ${list.map(s => chalk.whiteBright(`${s.InstanceProfileName}`))}\n\n`;
    },
    async deleteRoleFromInstanceProfile({ instanceProfileName, roleName, awsProfile, region }) {
        return exec(`aws iam remove-role-from-instance-profile --instance-profile-name ${instanceProfileName} --role-name ${roleName} --profile ${awsProfile} --region ${region}`);
    },
    async deleteInstanceProfile({ instanceProfileName, awsProfile, region }) {
        return exec(`aws iam delete-instance-profile --instance-profile-name ${instanceProfileName} --profile ${awsProfile} --region ${region}`);
    },
    async _clean({ list, awsProfile, region }) {
        for (let i = 0; i < list.length; i++) {
            let item = list[i];

            console.log(`Deleting IAM instance profile ${chalk.white(item.InstanceProfileName)} (${i + 1} out of ${list.length})...`);
            for (let ii = 0; ii < item.Roles.length; ii++) {
                let role = item.Roles[ii];

                console.log(`Deleting role ${role.RoleName} from instance profile ${item.InstanceProfileName}...`);
                await this.deleteRoleFromInstanceProfile({
                    instanceProfileName: item.InstanceProfileName,
                    roleName: role.RoleName,
                    awsProfile, region
                });
            }

            console.log('Deleting the instance profile itself..');
            const result = await this.deleteInstanceProfile({ instanceProfileName: item.InstanceProfileName, awsProfile, region });
            if (result.exitCode === 0) {
                console.log(chalk.greenBright(`IAM instance profile ${item.InstanceProfileName} was deleted successfully!`));
            }
            console.log('');
        }

        console.log(chalk.greenBright(`Successfully deleted all ${list.length} instance profiles!`));
    },
    async clean({ region, awsProfile, query = '', autoApprove = false }) {
        const { InstanceProfiles } = await this.getInstanceProfiles({ region, awsProfile });
        const list = (query.length > 0) ? InstanceProfiles.filter(s => s.InstanceProfileName.indexOf(query) > -1) : InstanceProfiles;

        if (list.length === 0) {
            console.log(chalk.green('No instance profiles found'));
        }

        if (!autoApprove) {
            console.log(this.prepareQuestion({ list, region }));

            inquirer.prompt([
                {
                    type: 'input',
                    name: 'confirm',
                    default: 'y',
                    message: `Proceed with destruction of ${list.length} IAM instance profiles?`
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