//Bismillahir Rahmanir Rahim
import * as test_methods from "./tests.mjs";

const list = Object.entries(test_methods);
const special_list = list.filter(([name, method]) => {
    if (name.startsWith('testonly_')) return true;
});
let worklist = list;
if (special_list.length) {
    console.warn("***only special test methods are taken");
    worklist = special_list;
}
for (const [name, method] of worklist) {
    console.log(`>${name}:`);
    method();
    console.log('-over');
}

// Alhamdulillah
