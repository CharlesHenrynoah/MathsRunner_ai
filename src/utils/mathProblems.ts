interface MathProblem {
  question: string;
  answer: number;
  type: string;
}

export const generateMathProblem = (level: number): MathProblem => {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * (level < 3 ? 2 : 3))];
  
  let num1: number, num2: number;
  
  switch (operation) {
    case '+':
      num1 = Math.floor(Math.random() * (10 * level)) + 1;
      num2 = Math.floor(Math.random() * (10 * level)) + 1;
      return {
        question: `${num1} + ${num2} = ?`,
        answer: num1 + num2,
        type: 'addition'
      };
    case '-':
      num1 = Math.floor(Math.random() * (10 * level)) + 1;
      num2 = Math.floor(Math.random() * num1) + 1; // Ensure positive result
      return {
        question: `${num1} - ${num2} = ?`,
        answer: num1 - num2,
        type: 'subtraction'
      };
    case '*':
      num1 = Math.floor(Math.random() * (5 * level)) + 1;
      num2 = Math.floor(Math.random() * (5 * level)) + 1;
      return {
        question: `${num1} × ${num2} = ?`,
        answer: num1 * num2,
        type: 'multiplication'
      };
    default:
      return {
        question: '1 + 1 = ?',
        answer: 2,
        type: 'addition'
      };
  }
};
