<?php

declare(strict_types=1);

namespace App\Controller;

use App\CustomResponse as Response;
use App\Helper;
use App\Service\{{className}}Service;
use Exception;
use Pimple\Psr11\Container;
use Psr\Http\Message\ServerRequestInterface as Request;

final class {{className}}Controller
{
  private {{className}}Service ${{classNameLowFirst}}Service;

  public function __construct(private readonly Container $container)
  {
    $this->{{classNameLowFirst}}Service = $this->container->get('{{classNameLowFirst}}Service');
  }

  public function getAll(Request $request, Response $response, array $args): Response
  {
    try {
      $result = $this->{{classNameLowFirst}}Service->getAll();
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 500);
    }
  }

  public function getOne(Request $request, Response $response, array $args): Response
  {
    try {
      $result = $this->{{classNameLowFirst}}Service->getOne(({{primaryKeyType}}) $args['{{primaryKey}}']);
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 404);
    }
  }

  public function create(Request $request, Response $response, array $args): Response
  {
    try {
      $input = $request->getParsedBody();

      $dto = [
        {{phpDto}}
      ];

      $dto = array_filter($dto, fn($value) => $value !== null);

      $this->{{classNameLowFirst}}Service->create($dto);
      return $response->withStatus(201);
    } catch (Exception $e) {
      $duplicateErrorCode = 1062;
      $foreignErrorCode = 1452;

      if ($e->getCode() === $duplicateErrorCode) {
        return $response->withJson(['error' => 'The data you try to insert already exists'], 409);
      } else if ($e->getCode() === $foreignErrorCode) {
       $error = Helper::getForeignKeyErrorMessage($e->getMessage());
        return $response->withJson(['error' => $error], 404);
      } else {
        return $response->withJson(['error' => $e->getMessage()], 500);
      }
    }
  }

  public function update(Request $request, Response $response, array $args): Response
  {
    try {
      $input = $request->getParsedBody();

      $dto = [
        {{phpUpdateDto}}
      ];

      $dto = array_filter($dto, fn($value) => $value !== null);

      $this->{{classNameLowFirst}}Service->update(({{primaryKeyType}}) $args['{{primaryKey}}'], $dto);
      return $response->withStatus(204);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 500);
    }
  }

  public function delete(Request $request, Response $response, array $args): Response
  {
   try {
     $result = $this->{{classNameLowFirst}}Service->delete(({{primaryKeyType}}) $args['{{primaryKey}}']);
     return $response->withJson($result);
   } catch (Exception $e) {
     return $response->withJson(['error' => $e->getMessage()], 400);
   }
  }

}