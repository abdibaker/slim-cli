<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;
use Exception;

final class {{pluralName}}Service
{
  public function __construct(private Connection $conn)
  {
  }

  public function getAll(): array
  {
    return $this->conn->fetchAllAssociative(
      'SELECT {{columnsToSelect}}
       FROM {{tableName}}
       ORDER BY {{primaryKeyColumnName}} ASC'
    );
  }


  public function getOne(string ${{primaryKeyColumnName}}): array
  {
    $result = $this->conn->fetchAssociative(
      'SELECT {{columnsToSelect}} 
       FROM {{tableName}} 
       WHERE {{primaryKeyColumnName}} = ?',
       [${{primaryKeyColumnName}}]
    );

    if (!$result) {
      throw new Exception('{{pluralName}} not found');
    }
    return $result;
  }

  public function create($data): int|string
  {
    return $this->conn->insert('{{tableName}}', $data);
  }

  public function update(string ${{primaryKeyColumnName}}, $data): int|string
  {
    return $this->conn->update('{{tableName}}', $data, ['{{primaryKeyColumnName}}' => ${{primaryKeyColumnName}}]);
  }

  public function delete(string ${{primaryKeyColumnName}}): int|string
  {
    return $this->conn->delete('{{tableName}}', ['{{primaryKeyColumnName}}' => ${{primaryKeyColumnName}}]);
  }

}