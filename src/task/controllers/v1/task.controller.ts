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
  UseGuards,
} from '@nestjs/common';
import { Public } from '@shared/decorators/public.decorator';
import { User } from '@shared/decorators/user.decorator';
import { CreateTaskRequestDtoV1 } from 'src/task/dtos/requests/v1/create-task-request.dto';
import { SearchTasksRequestDtoV1 } from 'src/task/dtos/requests/v1/search-tasks-request.dto';
import { UpdateTaskRequestDtoV1 } from 'src/task/dtos/requests/v1/update-task-request.dto';
import { UpdateTaskStatusRequestDtoV1 } from 'src/task/dtos/requests/v1/update-task-status-request.dto';
import { TaskModifyV1Guard } from 'src/task/guards/task-modify-v1.guard';
import { TaskStatusV1Guard } from 'src/task/guards/task-status-v1.guard';
import {
  TaskDeletedResponseV1,
  TaskResponseV1,
  TasksResponseV1,
} from 'src/task/interfaces/task';
import { TaskServiceV1 } from 'src/task/services/v1/task.service';

@Controller({ path: 'task', version: '1' })
export class TaskControllerV1 {
  constructor(private readonly taskService: TaskServiceV1) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  async getAllTasks(): Promise<TasksResponseV1> {
    return await this.taskService.getAllTasks();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @User('id') userId: string,
    @Body() body: CreateTaskRequestDtoV1,
  ): Promise<TaskResponseV1> {
    return await this.taskService.createTask(body, userId);
  }

  @Post('search')
  @Public()
  @HttpCode(HttpStatus.OK)
  async searchTasks(
    @Body() body: SearchTasksRequestDtoV1,
  ): Promise<TasksResponseV1> {
    return await this.taskService.searchTasks(body);
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getTaskById(@Param('id') id: string): Promise<TaskResponseV1> {
    return await this.taskService.getTaskById(id);
  }

  @Patch(':id')
  @UseGuards(TaskModifyV1Guard)
  @HttpCode(HttpStatus.OK)
  async updateTask(
    @Param('id') id: string,
    @Body() body: UpdateTaskRequestDtoV1,
  ): Promise<TaskResponseV1> {
    return await this.taskService.updateTask(id, body);
  }

  @Patch(':id/status')
  @UseGuards(TaskStatusV1Guard)
  @HttpCode(HttpStatus.OK)
  async updateTaskStatus(
    @Param('id') id: string,
    @Body() body: UpdateTaskStatusRequestDtoV1,
  ): Promise<TaskResponseV1> {
    return await this.taskService.updateTaskStatus(id, body.status);
  }

  @Delete(':id')
  @UseGuards(TaskModifyV1Guard)
  @HttpCode(HttpStatus.OK)
  async deleteTask(@Param('id') id: string): Promise<TaskDeletedResponseV1> {
    return await this.taskService.deleteTask(id);
  }
}
