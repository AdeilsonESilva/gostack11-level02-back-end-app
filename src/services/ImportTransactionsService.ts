import { getRepository, In } from 'typeorm';
import parse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

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
    const categoryRepository = getRepository(Category);
    const transactionRepository = getRepository(Transaction);
    const parser = parse({ delimiter: ', ', from_line: 2 });
    const csvReadStream = fs.createReadStream(file);
    const parseCSV = csvReadStream.pipe(parser);
    const allCategoriesCSV: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;

      allCategoriesCSV.push(category);
      transactionsCSV.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categoriesCSV = Array.from(new Set(allCategoriesCSV));

    const existsCategories = await categoryRepository.find({
      where: { title: In(categoriesCSV) },
    });

    const existsCategoriesTitle = Array.from(
      new Set(existsCategories.map(({ title }) => title)),
    );

    const createCategories = categoriesCSV.filter(
      category => !existsCategoriesTitle.includes(category),
    );

    const newCategories = categoryRepository.create(
      createCategories.map(title => ({ title })),
    );

    await categoryRepository.save(newCategories);

    const allCategories = [...existsCategories, ...newCategories];

    const transactions = transactionRepository.create(
      transactionsCSV.map(transactionCSV => ({
        title: transactionCSV.title,
        type: transactionCSV.type,
        value: transactionCSV.value,
        category: allCategories.find(
          category => category.title === transactionCSV.category,
        ),
      })),
    );

    await transactionRepository.save(transactions);
    await fs.promises.unlink(file);

    return transactions;
  }
}

export default ImportTransactionsService;
