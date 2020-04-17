import AppError from '../errors/AppError';
import { getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import { isUuid } from 'uuidv4';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    if (!isUuid(id)) {
      throw new AppError('Invalid id');
    }

    const transactionRepository = getRepository(Transaction);
    const transaction = await transactionRepository.findOne({ where: { id } });

    if (!transaction) {
      throw new AppError('Transaction not found');
    }

    await transactionRepository.delete(id);
  }
}

export default DeleteTransactionService;
