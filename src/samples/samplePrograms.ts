/**
 * CodeFlow Graph - Built-in Sample Programs & Tests
 */

import { SupportedLanguage } from '../types/codeflow.ts';

export interface SampleProgram {
  id: string;
  title: string;
  category: 'Required Tests' | 'Algorithms' | 'Control Flow' | 'Multi-Language';
  language: SupportedLanguage;
  description: string;
  code: string;
}

export const SAMPLE_PROGRAMS: SampleProgram[] = [
  {
    id: 'test-1-sequential',
    title: 'Test 1: Sequential Flow',
    category: 'Required Tests',
    language: 'c',
    description: 'Basic arithmetic variables and output statement with sequential control flow.',
    code: `int a = 5;
int b = 10;
int c = a + b;
printf("%d\\n", c);`,
  },
  {
    id: 'test-2-condition',
    title: 'Test 2: If / Else Branching',
    category: 'Required Tests',
    language: 'c',
    description: 'Conditional comparison evaluating TRUE and FALSE branches.',
    code: `int x = 10;

if (x > 5) {
    printf("greater\\n");
} else {
    printf("smaller\\n");
}`,
  },
  {
    id: 'test-3-loop',
    title: 'Test 3: For Loop Iterations',
    category: 'Required Tests',
    language: 'c',
    description: 'For loop tracking iteration steps, condition checks, and loop-back flow.',
    code: `for (int i = 0; i < 5; i++) {
    printf("%d\\n", i);
}`,
  },
  {
    id: 'test-4-function',
    title: 'Test 4: Function Invocation',
    category: 'Required Tests',
    language: 'c',
    description: 'Custom function declaration, parameter passing, calculation, and return flow.',
    code: `int add(int a, int b) {
    return a + b;
}

int result = add(5, 10);
printf("%d\\n", result);`,
  },
  {
    id: 'test-5-nested',
    title: 'Test 5: Nested Control Flow (Loop + If)',
    category: 'Required Tests',
    language: 'c',
    description: 'A loop containing an if/else condition to classify even and odd numbers.',
    code: `for (int i = 1; i <= 5; i++) {
    if (i % 2 == 0) {
        printf("%d is even\\n", i);
    } else {
        printf("%d is odd\\n", i);
    }
}`,
  },
  {
    id: 'test-6-recursion',
    title: 'Test 6: Recursive Factorial',
    category: 'Required Tests',
    language: 'c',
    description: 'Recursive function displaying call stack expansion, base-case condition, and unwind.',
    code: `int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int ans = factorial(4);
printf("Factorial of 4 is %d\\n", ans);`,
  },
  {
    id: 'algo-fibonacci',
    title: 'Recursive Fibonacci',
    category: 'Algorithms',
    language: 'c',
    description: 'Tree-recursive computation of the Nth Fibonacci number.',
    code: `int fib(int n) {
    if (n <= 1) {
        return n;
    }
    return fib(n - 1) + fib(n - 2);
}

int f = fib(5);
printf("Fibonacci(5) = %d\\n", f);`,
  },
  {
    id: 'algo-array-sum',
    title: 'Array Accumulation',
    category: 'Algorithms',
    language: 'c',
    description: 'Iterating an array and computing total sum and max element.',
    code: `int arr[5] = {4, 12, 7, 25, 9};
int sum = 0;
int maxVal = 0;

for (int i = 0; i < 5; i++) {
    sum += arr[i];
    if (arr[i] > maxVal) {
        maxVal = arr[i];
    }
}

printf("Sum = %d\\n", sum);
printf("Max = %d\\n", maxVal);`,
  },
  {
    id: 'python-gcd',
    title: 'Python: Euclidean GCD',
    category: 'Multi-Language',
    language: 'python',
    description: 'Greatest Common Divisor algorithm written in Python syntax.',
    code: `def gcd(a, b):
    while b != 0:
        temp = b
        b = a % b
        a = temp
    return a

result = gcd(48, 18)
print("GCD is", result)`,
  },
  {
    id: 'js-power',
    title: 'JavaScript: Recursive Power',
    category: 'Multi-Language',
    language: 'javascript',
    description: 'Computes base^exp using recursion and console output in JavaScript.',
    code: `function power(base, exp) {
    if (exp === 0) {
        return 1;
    }
    return base * power(base, exp - 1);
}

let res = power(2, 5);
console.log("2^5 =", res);`,
  },
  {
    id: 'java-binary-search',
    title: 'Java: While Loop Search',
    category: 'Multi-Language',
    language: 'java',
    description: 'Demonstrating Java structure with while loop and conditional checks.',
    code: `public class SearchDemo {
    public static void main(String[] args) {
        int target = 7;
        int current = 1;
        int steps = 0;

        while (current < target) {
            current = current + 2;
            steps = steps + 1;
        }

        System.out.println("Reached: " + current);
        System.out.println("Steps: " + steps);
    }
}`,
  },
];
