<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;
use Exception;

final class {{className}}Service
{
  public function __construct(private readonly Connection $conn)
  {
  }
  public function getAll(): array
  {
    return $this->conn->fetchAllAssociative(
      'SELECT {{columnsToSelect}}
       FROM {{tableName}}
       ORDER BY {{primaryKey}} ASC'
    );
  }


  public function getOne({{primaryKeyType}} ${{primaryKey}}): array
  {
    $result = $this->conn->fetchAssociative(
      'SELECT {{columnsToSelect}} 
       FROM {{tableName}} 
       WHERE {{primaryKey}} = ?',
       [${{primaryKey}}]
    );

    if (!$result) {
      throw new Exception('{{className}} not found');
    }
    return $result;
  }
  public function create($data): int|string
  {
    return $this->conn->insert('{{tableName}}', $data);
  }

  public function update({{primaryKeyType}} ${{primaryKey}}, $data): int|string
  {
    return $this->conn->update('{{tableName}}', $data, ['{{primaryKey}}' => ${{primaryKey}}]);
  }

  public function delete({{primaryKeyType}} ${{primaryKey}}): int|string
  {
    return $this->conn->delete('{{tableName}}', ['{{primaryKey}}' => ${{primaryKey}}]);
  }
}
