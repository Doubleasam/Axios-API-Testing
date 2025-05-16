require('dotenv').config();
const baseUrl = process.env.BASE_URL;

const fs = require('fs');
const axios = require('axios');
const { expect } = require('chai');

const postmanCollection = JSON.parse(fs.readFileSync('store.collection.json', 'utf-8'));

if (!postmanCollection.item || !Array.isArray(postmanCollection.item)) {
    throw new Error("Error: postmanCollection.item is not defined or is not an array");
}

postmanCollection.item.forEach(group => {
    describe(`Test group: ${group.name}`, () => {
        if (!group.item || !Array.isArray(group.item)) {
            console.warn(`Skipping group: ${group.name} (no nested items)`);
            return;
        }

        group.item.forEach(subGroup => {
            describe(`Subgroup: ${subGroup.name}`, () => {
                if (!subGroup.item || !Array.isArray(subGroup.item)) {
                    console.warn(`Skipping subgroup: ${subGroup.name} (no nested items)`);
                    return;
                }

                subGroup.item.forEach(testCase => {
                    if (!testCase.request) {
                        console.warn(`Skipping test: ${testCase.name} (no request object)`);
                        return;
                    }

                    it(`Test: ${testCase.name}`, async () => {
                        const requestConfig = {
                            method: testCase.request.method.toLowerCase(),
                            url: `${baseUrl}${testCase.request.url.raw.replace('{{baseUrl}}', '')}`,
                            params: testCase.request.url.query
                                ? Object.fromEntries(testCase.request.url.query.map(q => [q.key, q.value]))
                                : {},
                        };

                        console.log(`Sending request: ${requestConfig.url} with parameters:`, requestConfig.params);

                        try {
                            const response = await axios(requestConfig);

                            expect(response.status).to.be.oneOf([200, 400]);

                            if (response.status === 200) {
                                expect(response.data).to.be.an("array");
                                expect(response.data.length).to.be.at.most(parseInt(requestConfig.params.pageSize) || 10);
                            } else if (response.status === 400) {
                                console.warn(`API returned 400 for request: ${requestConfig.url} (check the parameters)`);
                            }
                        } catch (error) {
                            console.error(`Test execution error: ${testCase.name}`, error.response?.data || error.message);
                            throw error;
                        }
                    });
                });
            });
        });
    });
});