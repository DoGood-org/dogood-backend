import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { AuthV1 } from '@shared/decorators/auth-v1.decorator';
import { Public } from '@shared/decorators/public.decorator';
import { User } from '@shared/decorators/user.decorator';
import { GetTasksPageRequestDtoV1 } from 'src/task/dtos/requests/v1/get-tasks-page-request.dto';
import { CreateTaskRequestDtoV1 } from 'src/task/dtos/requests/v1/create-task-request.dto';
import { SearchTasksRequestDtoV1 } from 'src/task/dtos/requests/v1/search-tasks-request.dto';
import { UpdateTaskRequestDtoV1 } from 'src/task/dtos/requests/v1/update-task-request.dto';
import { UpdateTaskStatusRequestDtoV1 } from 'src/task/dtos/requests/v1/update-task-status-request.dto';
import { DeleteTaskResponseDtoV1 } from 'src/task/dtos/responses/v1/delete-task-response.dto';
import { GetTasksPageResponseDtoV1 } from 'src/task/dtos/responses/v1/get-tasks-page-response.dto';
import { TaskResponseDtoV1 } from 'src/task/dtos/responses/v1/task-response.dto';
import { TaskModifyV1Guard } from 'src/task/guards/task-modify-v1.guard';
import { TaskStatusV1Guard } from 'src/task/guards/task-status-v1.guard';
import {
  PaginatedTasksResponseV1,
  TaskDeletedResponseV1,
  TaskResponseV1,
} from 'src/task/interfaces/task';
import { TaskServiceV1 } from 'src/task/services/v1/task.service';

@AuthV1()
@Controller({ path: 'task', version: '1' })
export class TaskControllerV1 {
  constructor(private readonly taskService: TaskServiceV1) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetTasksPageResponseDtoV1 })
  async getAllTasks(
    @Query() query: GetTasksPageRequestDtoV1,
  ): Promise<PaginatedTasksResponseV1> {
    return await this.taskService.getAllTasks(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: TaskResponseDtoV1 })
  async createTask(
    @User('id') userId: string,
    @Body() body: CreateTaskRequestDtoV1,
  ): Promise<TaskResponseV1> {
    return await this.taskService.createTask(body, userId);
  }

  @Post('search')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetTasksPageResponseDtoV1 })
  async searchTasks(
    @Body() body: SearchTasksRequestDtoV1,
    @Query() query: GetTasksPageRequestDtoV1,
  ): Promise<PaginatedTasksResponseV1> {
    return await this.taskService.searchTasks(body, query);
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TaskResponseDtoV1 })
  async getTaskById(@Param('id') id: string): Promise<TaskResponseV1> {
    return await this.taskService.getTaskById(id);
  }

  @Patch(':id')
  @UseGuards(TaskModifyV1Guard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TaskResponseDtoV1 })
  async updateTask(
    @Param('id') id: string,
    @Body() body: UpdateTaskRequestDtoV1,
  ): Promise<TaskResponseV1> {
    return await this.taskService.updateTask(id, body);
  }

  @Patch(':id/status')
  @UseGuards(TaskStatusV1Guard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TaskResponseDtoV1 })
  async updateTaskStatus(
    @Param('id') id: string,
    @Body() body: UpdateTaskStatusRequestDtoV1,
  ): Promise<TaskResponseV1> {
    return await this.taskService.updateTaskStatus(id, body.status);
  }

  @Delete(':id')
  @UseGuards(TaskModifyV1Guard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: DeleteTaskResponseDtoV1 })
  async deleteTask(@Param('id') id: string): Promise<TaskDeletedResponseV1> {
    return await this.taskService.deleteTask(id);
  }
}
