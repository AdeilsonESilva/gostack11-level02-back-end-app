import Transaction from '../models/Transaction';
import CreateTransactionService from './CreateTransactionService';
import parse from 'csv-parse';
import fs from 'fs';

interface Request {
  file: string;
}

interface TransactionCSV {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ file }: Request): Promise<Transaction[]> {
    const transactionsCSV: TransactionCSV[] = [];
    const transactions: Transaction[] = [];
    const createTransaction = new CreateTransactionService();

    const parser = parse({ delimiter: ', ', from_line: 2 });
    const csvReadStream = fs.createReadStream(file);
    const parseCSV = csvReadStream.pipe(parser);

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;
      transactionsCSV.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    for (const transactionCSV of transactionsCSV) {
      const { title, type, value, category } = transactionCSV;
      const transaction = await createTransaction.execute({
        title,
        type,
        value,
        category,
      });

      transactions.push(transaction);
    }

    return transactions;
  }
}

export default ImportTransactionsService;
