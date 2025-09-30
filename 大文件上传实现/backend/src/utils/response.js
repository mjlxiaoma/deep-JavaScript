/**
 * 统一的API响应格式
 */
class Response {
  /**
   * 成功响应
   */
  static success(res, data = null, message = '操作成功', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 失败响应
   */
  static error(res, message = '操作失败', statusCode = 400, error = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(error && { error: error.message || error }),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 分页响应
   */
  static paginate(res, data, total, page = 1, pageSize = 10) {
    return res.json({
      success: true,
      data,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 创建成功响应
   */
  static created(res, data, message = '创建成功') {
    return this.success(res, data, message, 201);
  }

  /**
   * 无内容响应
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * 未找到响应
   */
  static notFound(res, message = '资源不存在') {
    return this.error(res, message, 404);
  }

  /**
   * 未授权响应
   */
  static unauthorized(res, message = '未授权') {
    return this.error(res, message, 401);
  }

  /**
   * 禁止访问响应
   */
  static forbidden(res, message = '禁止访问') {
    return this.error(res, message, 403);
  }

  /**
   * 服务器错误响应
   */
  static serverError(res, error, message = '服务器错误') {
    return this.error(res, message, 500, error);
  }

  /**
   * 参数验证失败响应
   */
  static validationError(res, errors) {
    return res.status(422).json({
      success: false,
      message: '参数验证失败',
      errors,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = Response; 