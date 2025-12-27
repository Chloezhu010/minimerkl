import {} from "ethers";

const numberArray = [40, 1, 5, 200];

numberArray.sort((a, b) => {
    return a - b;
})

console.log("Sorted array:", numberArray);