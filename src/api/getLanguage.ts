/**
 * Demo of translation locale loading
 */
export default () =>
    new Promise(resolve => {
        setTimeout(() => {
            resolve({
                generic: {
                    "server-loaded-message": "Async message translation"
                }
            });
        }, 1000)
    })