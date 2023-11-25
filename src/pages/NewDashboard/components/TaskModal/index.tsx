import { Button, Calendar, Modal, Popover, Popconfirm, DatePicker, message, notification, Mentions } from 'antd'
import type { MentionsRef } from 'antd/es/mentions'
import dayjs, { type Dayjs } from 'dayjs'
import { useAtomValue } from 'jotai'
import React, { useEffect, useState } from 'react'
import { BsCalendar4Event, BsCalendar4Range, BsClock, BsClockHistory } from 'react-icons/bs'
import { IoIosCheckmarkCircleOutline } from 'react-icons/io'
import { RiCheckboxBlankCircleLine, RiDeleteBin4Line } from 'react-icons/ri'

import DurationSelect from '@/components/TaskModal/components/DurationSelect'
import TimeSelect from '@/components/TaskModal/components/TimeSelect'
import { SHOW_DATETIME_FORMATTER, SHOW_DATE_FORMATTER } from '@/constants/agenda'
import usePages from '@/hooks/usePages'
import { deleteTask, updateTaskStatus } from '@/newHelper/block'
import { navToLogseqBlock } from '@/newHelper/logseq'
import { type BlockFromQuery, transformBlockToAgendaTask, retrieveFilteredBlocks } from '@/newHelper/task'
import { track } from '@/newHelper/umami'
import { logseqAtom } from '@/newModel/logseq'
import { settingsAtom } from '@/newModel/settings'
import type { AgendaTask, TimeLog } from '@/types/task'

import LogseqLogo from '../LogseqLogo'
import PageIcon from '../PageIcon'
import PageSelect from '../PageSelect'
import TimeLogComponent from './TimeLog'
import useCreate, { type CreateTaskForm } from './useCreate'
import useEdit from './useEdit'

const TaskModal = ({
  open,
  info,
  children,
  onOk,
  onCancel,
  onDelete,
  triggerClassName,
}: {
  open?: boolean
  onCancel?: () => void
  onOk?: (task: AgendaTask) => void
  onDelete?: (taskId: string) => void
  children?: React.ReactNode
  triggerClassName?: string
  info:
    | {
        type: 'create'
        initialData: Partial<CreateTaskForm>
      }
    | {
        type: 'edit'
        initialTaskData: AgendaTask
      }
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const _open = children ? internalOpen : open
  const [mode, setMode] = useState<'Normal' | 'Advanced'>('Normal')
  const titleInputRef = React.useRef<MentionsRef>(null)
  const [titleTagSearchText, setTitleTagSearchText] = useState('')
  const settings = useAtomValue(settingsAtom)
  const { currentGraph } = useAtomValue(logseqAtom)
  const { allPages: pages, refreshPages } = usePages()

  const groupType = settings.selectedFilters?.length ? 'filter' : 'page'

  const createHookResult = useCreate(info.type === 'create' ? info.initialData : null)
  const editHookResult = useEdit(info.type === 'edit' ? info.initialTaskData : null)
  const {
    formData,
    updateFormData,
    reset: resetFormData,
    allDay,
    start,
  } = info.type === 'create' ? createHookResult : editHookResult
  const { create } = createHookResult
  const { edit } = editHookResult
  const action = info.type === 'edit' ? edit : create
  // can't edit recurring task
  const editDisabled =
    info.type === 'edit' && (info.initialTaskData.rrule || info.initialTaskData.recurringPast) ? true : false

  const showStartTimeFormatter = allDay ? SHOW_DATE_FORMATTER : SHOW_DATETIME_FORMATTER

  const handleCancel = () => {
    setInternalOpen(false)
    onCancel?.()
  }
  const handleOk = async () => {
    track(`Task Modal: Ok Button`, { type: info.type })
    const block = await action()
    if (!block) return message.error('Failed to create/edit task block')
    const page = await logseq.Editor.getPage(block?.page?.id ?? block?.page)
    if (!page) return message.error('Failed to find page')
    const favoritePages = (await logseq.App.getCurrentGraphFavorites()) || []
    const task = await transformBlockToAgendaTask(
      {
        ...block,
        page: {
          ...page,
          originalName: page.originalName,
          journalDay: page.journalDay,
          isJournal: page?.['journal?'],
        },
      } as unknown as BlockFromQuery,
      favoritePages,
      settings,
    )

    const filters = settings.filters?.filter((_filter) => settings.selectedFilters?.includes(_filter.id)) ?? []
    const filterBlocks = await retrieveFilteredBlocks(filters)
    if (settings.selectedFilters?.length) {
      const filterBlockIds = filterBlocks.map((block) => block.uuid)
      if (filterBlockIds.includes(block.uuid)) {
        const filters = filterBlocks
          .filter((filterBlock) => filterBlock.uuid === block.uuid)
          .map((filterBlock) => filterBlock.filter)
        onOk?.({
          ...task,
          filters,
        })
      } else {
        notification.info({
          message: 'Operation successful but task is hidden',
          description: 'Task was hidden because it dose not match any of your filters.',
          duration: 0,
        })
      }
    } else {
      onOk?.(task)
    }
    setInternalOpen(false)
  }
  const handleDelete = async () => {
    if (info.type === 'edit') {
      await deleteTask(info.initialTaskData.id)
      onDelete?.(info.initialTaskData.id)
      setInternalOpen(false)
    }
  }
  const handleSwitchRangeMode = (mode: 'range' | 'date') => {
    const start = formData.startDateVal ?? dayjs()
    const end = mode === 'range' ? start.add(1, 'day') : undefined
    updateFormData({ endDateVal: end })
  }
  const reset = () => {
    resetFormData()
    setMode('Normal')
    titleInputRef.current?.blur()
  }
  const addDefaultTimeLog = () => {
    const curTimeLogs = editHookResult.formData.timeLogs ?? []
    const lastTimeLog = curTimeLogs[curTimeLogs.length - 1]
    const DEFAULT_DURATION = 30
    let logStart = start && allDay === false ? start : dayjs().subtract(DEFAULT_DURATION, 'minute')
    if (lastTimeLog) logStart = lastTimeLog.end.add(DEFAULT_DURATION, 'minute')
    const logEnd = logStart.add(DEFAULT_DURATION, 'minute')
    updateFormData({ timeLogs: [...curTimeLogs, { start: logStart, end: logEnd, amount: DEFAULT_DURATION }] })
  }
  const deleteTimeLog = (index: number) => {
    const curTimeLogs = editHookResult.formData.timeLogs ?? []
    const newTimeLogs = curTimeLogs.filter((_, i) => index !== i)
    updateFormData({ timeLogs: newTimeLogs })
  }
  const updateTimeLog = (index: number, data: TimeLog) => {
    const curTimeLogs = editHookResult.formData.timeLogs ?? []
    const newTimeLogs = curTimeLogs.map((log, i) => {
      if (index === i) return data
      return log
    })
    updateFormData({ timeLogs: newTimeLogs })
  }
  const createPage = async () => {
    await logseq.Editor.createPage(titleTagSearchText)
    refreshPages()
    message.success('Page created')
  }
  const onSwitchTaskStatus = async (status: AgendaTask['status']) => {
    if (editDisabled) return message.error('Please modify the status of the recurring task in logseq.')
    if (info.type !== 'edit') return

    await updateTaskStatus(info.initialTaskData, status)
    onOk?.({
      ...info.initialTaskData,
      status,
      rawBlock: {
        ...info.initialTaskData.rawBlock,
        marker: status === 'todo' ? 'TODO' : 'DONE',
      },
    })
    onCancel?.()
    setInternalOpen(false)
  }
  useEffect(() => {
    // 增加延时，否则二次打开无法自动聚焦
    if (_open) setTimeout(() => titleInputRef.current?.focus(), 0)
  }, [_open])
  return (
    <>
      {children ? (
        <span className={triggerClassName} onClick={() => setInternalOpen(true)}>
          {children}
        </span>
      ) : null}
      <Modal
        className="!w-[620px]"
        open={_open}
        closeIcon={false}
        keyboard={false}
        maskClosable={false}
        onCancel={handleCancel}
        okText={info.type === 'create' ? 'Add Task' : 'Save'}
        onOk={handleOk}
        afterClose={reset}
        footer={
          <div className="flex items-center justify-between">
            <div>
              {info.type === 'edit' && info.initialTaskData.status === 'todo' ? (
                <Button
                  className="inline-flex items-center px-2"
                  icon={<IoIosCheckmarkCircleOutline className="text-base" />}
                  disabled={editDisabled}
                  onClick={() => onSwitchTaskStatus('done')}
                >
                  Complete
                </Button>
              ) : null}
              {info.type === 'edit' && info.initialTaskData.status === 'done' ? (
                <Button
                  className="inline-flex items-center px-2"
                  disabled={editDisabled}
                  icon={<RiCheckboxBlankCircleLine />}
                  onClick={() => onSwitchTaskStatus('todo')}
                >
                  Incomplete
                </Button>
              ) : null}
              {info.type === 'edit' ? (
                <Popconfirm
                  key="delete"
                  title="Delete the task"
                  description="Are you sure to delete this task?"
                  onConfirm={handleDelete}
                >
                  <Button
                    className="hover:!text-red-500 hover:!border-red-500 inline-flex items-center px-2"
                    icon={<RiDeleteBin4Line />}
                  >
                    Delete
                  </Button>
                </Popconfirm>
              ) : null}
              {info.type === 'edit' ? (
                <Button
                  className="inline-flex items-center justify-center text-gray-400"
                  shape="circle"
                  icon={<LogseqLogo />}
                  onClick={() => {
                    navToLogseqBlock(info.initialTaskData, currentGraph)
                    onCancel?.()
                    setInternalOpen(false)
                  }}
                />
              ) : null}
            </div>
            <div>
              <Button key="cancel" onClick={handleCancel}>
                Cancel
              </Button>
              <Button key="ok" type="primary" onClick={handleOk} disabled={editDisabled}>
                {info.type === 'create' ? 'Add Task' : 'Save'}
              </Button>
            </div>
          </div>
        }
      >
        <Mentions
          autoFocus
          ref={titleInputRef}
          className="!text-2xl !px-0 !border-0 !shadow-none"
          placeholder="Title"
          prefix="#"
          options={pages.map((page) => ({ value: page.originalName, label: page.originalName, key: page.id }))}
          value={formData.title}
          onChange={(val) => updateFormData({ title: val.replace(/\n/, '') })}
          notFoundContent={
            <Button type="link" size="small" onClick={createPage}>
              New Page: {titleTagSearchText}
            </Button>
          }
          onSearch={(text) => setTitleTagSearchText(text)}
        />
        {/* ========== Start Date Start ========= */}
        {formData.endDateVal ? (
          <div className="flex my-2">
            <div className="w-[160px] text-gray-400 flex gap-1 items-center">
              <BsCalendar4Range /> Date Range
            </div>
            <div className="flex items-center group gap-1">
              <DatePicker.RangePicker
                allowClear={false}
                bordered={false}
                suffixIcon={null}
                value={[formData.startDateVal ?? dayjs(), formData.endDateVal]}
                // @ts-expect-error type correct
                onChange={(val: [Dayjs, Dayjs]) => val && updateFormData({ startDateVal: val[0], endDateVal: val[1] })}
              />
              <BsCalendar4Event
                className="text-gray-400 invisible group-hover:visible cursor-pointer"
                onClick={() => handleSwitchRangeMode('date')}
              />
            </div>
          </div>
        ) : (
          <div className="flex my-2">
            <div className="w-[160px] text-gray-400 flex gap-1 items-center">
              <BsCalendar4Event /> Start Date
            </div>
            <div className="flex items-center group gap-1">
              <Popover
                trigger={['click']}
                arrow={false}
                placement="bottomLeft"
                content={
                  <div className="w-[300px] p-2">
                    <Calendar
                      fullscreen={false}
                      value={formData.startDateVal}
                      onChange={(val) => updateFormData({ startDateVal: val })}
                    />
                    <TimeSelect
                      bordered
                      placeholder="Time"
                      value={formData.startTime}
                      onChange={(val) => updateFormData({ startTime: val })}
                    />
                  </div>
                }
              >
                <div className="hover:bg-gray-100 px-3 py-1 rounded cursor-pointer">
                  {formData.startDateVal && start ? (
                    start.format(showStartTimeFormatter)
                  ) : (
                    <span className="text-gray-400">Select start Date</span>
                  )}
                </div>
              </Popover>
              <BsCalendar4Range
                className="text-gray-400 invisible group-hover:visible cursor-pointer"
                onClick={() => handleSwitchRangeMode('range')}
              />
            </div>
          </div>
        )}
        {/* ========= Start Date End ========= */}

        {/* ========= Estimated Time Start ========= */}
        <div className="flex my-2">
          <div className="w-[160px] text-gray-400 flex gap-1 items-center">
            <BsClock /> Estimated Time
          </div>
          <DurationSelect
            bordered={false}
            className="w-[100px]"
            value={formData.estimatedTime}
            onChange={(val) => updateFormData({ estimatedTime: val })}
          />
        </div>
        {/* ========= Estimated Time End ========= */}

        {/* ========= Actual Time Start ========= */}
        {info.type === 'edit' ? (
          <div className="flex items-start">
            <div className="w-[160px] text-gray-400 flex gap-1 items-center h-[32px]">
              <BsClockHistory /> Actual Time
            </div>
            <div>
              <div className="px-3 py-1 flex gap-2 items-center cursor-pointer h-[32px]">
                {formData.actualTime}
                <div className="text-xs text-gray-400 hover:text-gray-800" onClick={addDefaultTimeLog}>
                  (Add a log)
                </div>
              </div>
              {editHookResult.formData.timeLogs?.map((timeLog, index) => (
                <div key={index} className="group flex items-center w-[220px] justify-between">
                  <TimeLogComponent
                    value={{ start: timeLog.start, end: timeLog.end, amount: timeLog.amount }}
                    onChange={(newTimeLog) => updateTimeLog(index, newTimeLog)}
                  />
                  <RiDeleteBin4Line
                    className="hidden group-hover:block text-red-300 hover:text-red-500 cursor-pointer"
                    onClick={() => deleteTimeLog(index)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {/* ========= Actual Time End ========= */}

        {/* ========= Page Start ========= */}
        <div className="flex my-2">
          <div className="w-[160px] text-gray-400 flex gap-1 items-center">
            {/* <BsClipboard /> Page */}
            <PageIcon /> Page
          </div>
          <PageSelect
            showPageColor={groupType === 'page'}
            value={formData.projectId}
            onChange={(val) => updateFormData({ projectId: val })}
          />
        </div>
        {/* ========= Page End ========= */}

        {/* <Divider className="!m-0" orientation="center" orientationMargin={0} dashed>
          <Button
            className="!p-0 !text-gray-400"
            type="link"
            onClick={() => setMode((_mode) => (_mode === 'Normal' ? 'Advanced' : 'Normal'))}
          >
            {mode === 'Normal' ? 'Normal' : 'Advanced'}
          </Button>
        </Divider> */}

        {mode === 'Advanced' ? (
          <div>
            {/* <div className="flex">
                <div className="w-[160px] text-gray-400 flex gap-1 items-center">
                  <LuCalendar /> Label
                </div>
                <TimeSelect className="w-[100px]" value={plannedTime} onChange={setPlannedTime} />
              </div>
              <div className="flex">
                <div className="w-[160px] text-gray-400 flex gap-1 items-center">
                  <LuCalendar /> Due
                </div>
                <TimeSelect className="w-[100px]" value={plannedTime} onChange={setPlannedTime} />
              </div>
              <div className="flex">
                <div className="w-[160px] text-gray-400 flex gap-1 items-center">
                  <LuCalendar /> Repeat
                </div>
                <TimeSelect className="w-[100px]" value={plannedTime} onChange={setPlannedTime} />
              </div> */}
          </div>
        ) : null}
      </Modal>
    </>
  )
}

export default TaskModal
