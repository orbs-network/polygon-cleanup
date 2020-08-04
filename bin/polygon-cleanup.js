#!/usr/bin/env node

const { program } = require('commander');
const secretsService = require('./../lib/secrets');
const instanceProfilesService = require('../lib/iam-instance-profiles');
const iamRolesService = require('./../lib/iam-roles');
const keyPairService = require('./../lib/ec2-keypairs');
const efsService = require('./../lib/efs');

program
    .command('secrets --region --profile --query')
    .description('run secrets manager cleanup for the specified region/awsProfile')
    .option('--region <region>', 'The AWS region to perform the action on')
    .option('--profile <profileName>', 'The AWS profile to use')
    .option("-q, --query [string]", "Incase you want to delete secrets matching a specific search term")
    .action(async function ({ region, profile, query = '' }) {
        await secretsService.clean({ region, awsProfile: profile, query });
    });

program
    .command('instance-profiles --region --profile --query')
    .description('run iam-instance-profiles cleanup for the specified region/awsProfile')
    .option('--region <region>', 'The AWS region to perform the action on')
    .option('--profile <profileName>', 'The AWS profile to use')
    .option("-q, --query [string]", "Incase you want to delete instance profiles matching a specific search term")
    .action(async function ({ region, profile, query = '' }) {
        await instanceProfilesService.clean({ region, awsProfile: profile, query });
    });

program
    .command('iam-roles --region --profile --query')
    .description('run iam roles cleanup for the specified region/awsProfile')
    .option('--region <region>', 'The AWS region to perform the action on')
    .option('--profile <profileName>', 'The AWS profile to use')
    .option("-q, --query [string]", "Incase you want to delete iam roles matching a specific search term")
    .action(async function ({ region, profile, query = '' }) {
        await iamRolesService.clean({ region, awsProfile: profile, query });
    });

program
    .command('key-pairs --region --profile --query')
    .description('run EC2 SSH key pairs cleanup for the specified region/awsProfile')
    .option('--region <region>', 'The AWS region to perform the action on')
    .option('--profile <profileName>', 'The AWS profile to use')
    .option("-q, --query [string]", "Incase you want to delete a keypair matching a specific search term")
    .action(async function ({ region, profile, query = '' }) {
        await keyPairService.clean({ region, awsProfile: profile, query });
    });

program
    .command('efs --region --profile --query')
    .description('run EFS drives cleanup for the specified region/awsProfile')
    .option('--region <region>', 'The AWS region to perform the action on')
    .option('--profile <profileName>', 'The AWS profile to use')
    .option("-q, --query [string]", "Incase you want to delete a keypair matching a specific search term")
    .action(async function ({ region, profile, query = '' }) {
        await efsService.clean({ region, awsProfile: profile, query });
    });

program.parse(process.argv);
