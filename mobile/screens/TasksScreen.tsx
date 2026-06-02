import { useCallback, useEffect, useState } from 'react';

import {

  Alert,

  Modal,

  Pressable,

  RefreshControl,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  View,

} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { radii } from '../constants/theme';

import { Card } from '../components/Card';
import { DateField } from '../components/DateField';

import { PrimaryButton } from '../components/PrimaryButton';

import { SecondaryButton } from '../components/SecondaryButton';

import { SectionTitle } from '../components/SectionTitle';

import { useAuth } from '../context/AuthContext';

import { useTabContentPadding } from '../hooks/useTabContentPadding';

import { useThemedStyles } from '../hooks/useThemedStyles';

import { useThemeColors, type ThemeColors } from '../hooks/useThemeColors';

import {

  completeTask,

  createTask,

  deleteTask,

  getMyTasks,

  updateTask,

  type TaskPriority,

  type TaskRecord,

} from '../services/tasks';



const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];



function priorityLabel(p: TaskPriority): string {

  return p.charAt(0).toUpperCase() + p.slice(1);

}

function formatDue(d: string | null): string {
  if (!d) return 'No due date';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseDueDateInput(raw: string): string | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  const d = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}



export function TasksScreen() {

  const styles = useThemedStyles(createTasksStyles);

  const c = useThemeColors();

  const bottomPad = useTabContentPadding(24);

  const { refreshUser } = useAuth();

  const [tasks, setTasks] = useState<TaskRecord[]>([]);

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);



  const [editOpen, setEditOpen] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState('');

  const [editDescription, setEditDescription] = useState('');

  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editDueDate, setEditDueDate] = useState('');

  const [savingEdit, setSavingEdit] = useState(false);



  const load = useCallback(async () => {

    setError(null);

    try {

      const list = await getMyTasks();
      const filtered =
        filter === 'all'
          ? list
          : list.filter(
              (t) =>
                t.status === filter || (filter === 'pending' && t.status === 'in_progress'),
            );
      setTasks(filtered);

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Could not load tasks.');

    } finally {

      setLoading(false);

    }

  }, [filter]);



  useEffect(() => {

    void load();

  }, [load]);



  const onRefresh = useCallback(async () => {

    setRefreshing(true);

    try {

      await load();

    } finally {

      setRefreshing(false);

    }

  }, [load]);



  async function handleCreate() {

    if (!title.trim()) return;

    const parsedDue = parseDueDateInput(dueDate);
    if (parsedDue === undefined) {
      setError('Due date must be YYYY-MM-DD.');
      return;
    }

    try {

      await createTask({ title: title.trim(), priority, dueDate: parsedDue });

      setTitle('');
      setDueDate('');

      await load();

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Could not create task.');

    }

  }



  async function handleComplete(id: string) {

    try {

      await completeTask(id);

      await Promise.all([load(), refreshUser()]);

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Could not complete task.');

    }

  }



  function handleDelete(id: string) {

    Alert.alert('Delete task', 'Remove this task?', [

      { text: 'Cancel', style: 'cancel' },

      {

        text: 'Delete',

        style: 'destructive',

        onPress: () => {

          void deleteTask(id).then(load);

        },

      },

    ]);

  }



  function openEdit(task: TaskRecord) {

    setEditId(task._id);

    setEditTitle(task.title);

    setEditDescription(task.description ?? '');

    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');

    setEditOpen(true);

  }



  function closeEdit() {

    setEditOpen(false);

    setEditId(null);

    setSavingEdit(false);

  }



  async function handleSaveEdit() {

    if (!editId || !editTitle.trim()) return;

    const parsedDue = parseDueDateInput(editDueDate);
    if (parsedDue === undefined) {
      setError('Due date must be YYYY-MM-DD.');
      return;
    }

    setSavingEdit(true);

    setError(null);

    try {

      await updateTask(editId, {

        title: editTitle.trim(),

        description: editDescription.trim(),

        priority: editPriority,
        dueDate: parsedDue,

      });

      closeEdit();

      await load();

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Could not update task.');

      setSavingEdit(false);

    }

  }



  return (

    <SafeAreaView style={styles.safe} edges={['top']}>

      <ScrollView

        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}

        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}

      >

        <Text style={styles.pageTitle}>Tasks</Text>



        <Card style={styles.formCard}>

          <SectionTitle>New task</SectionTitle>

          <TextInput

            style={styles.input}

            placeholder="Task title"

            placeholderTextColor={c.placeholder}

            value={title}

            onChangeText={setTitle}

            maxLength={200}

          />

          <View style={styles.chipRow}>
            {PRIORITIES.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPriority(p)}
                style={[styles.chip, priority === p && styles.chipActive]}
              >
                <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>
                  {priorityLabel(p)}
                </Text>
              </Pressable>
            ))}
          </View>

          <DateField
            label="Due date (optional)"
            value={dueDate}
            onChange={setDueDate}
            onClear={() => setDueDate('')}
          />

          <PrimaryButton label="Add task" onPress={() => void handleCreate()} />

        </Card>

        <View style={styles.filterRow}>
          {(['all', 'pending', 'completed'] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.filterChip, filter === key && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
                {key === 'all' ? 'All' : key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.err}>{error}</Text> : null}

        {loading ? <Text style={styles.muted}>Loading tasks…</Text> : null}



        {tasks.map((task) => (

          <Card key={task._id} style={styles.taskCard}>

            <Text style={styles.taskTitle}>{task.title}</Text>

            {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}

            <Text style={styles.taskMeta}>

              {task.priority} · {task.status.replace('_', ' ')} · {formatDue(task.dueDate)}

            </Text>

            {task.status !== 'completed' ? (

              <View style={styles.rowActions}>

                <PrimaryButton

                  label="Complete (+30 XP)"

                  onPress={() => void handleComplete(task._id)}

                  style={styles.actionBtn}

                />

                <SecondaryButton label="Edit" onPress={() => openEdit(task)} style={styles.actionBtn} />

              </View>

            ) : (

              <SecondaryButton label="Edit" onPress={() => openEdit(task)} style={styles.editOnlyBtn} />

            )}

            <Pressable onPress={() => handleDelete(task._id)}>

              <Text style={styles.deleteLink}>Delete</Text>

            </Pressable>

          </Card>

        ))}



        {!loading && tasks.length === 0 ? (

          <Text style={styles.muted}>No tasks yet.</Text>

        ) : null}

      </ScrollView>



      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={closeEdit}>

        <View style={styles.modalBackdrop}>

          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>Edit task</Text>

            <Text style={styles.fieldLabel}>Title</Text>

            <TextInput

              style={styles.input}

              value={editTitle}

              onChangeText={setEditTitle}

              maxLength={200}

              placeholderTextColor={c.placeholder}

            />

            <Text style={styles.fieldLabel}>Description</Text>

            <TextInput

              style={[styles.input, styles.textArea]}

              value={editDescription}

              onChangeText={setEditDescription}

              multiline

              maxLength={500}

              placeholder="Optional notes"

              placeholderTextColor={c.placeholder}

            />

            <Text style={styles.fieldLabel}>Priority</Text>

            <View style={styles.chipRow}>

              {PRIORITIES.map((p) => (

                <Pressable

                  key={p}

                  onPress={() => setEditPriority(p)}

                  style={[styles.chip, editPriority === p && styles.chipActive]}

                >

                  <Text style={[styles.chipText, editPriority === p && styles.chipTextActive]}>

                    {priorityLabel(p)}

                  </Text>

                </Pressable>

              ))}

            </View>

            <DateField
              label="Due date (optional)"
              value={editDueDate}
              onChange={setEditDueDate}
              onClear={() => setEditDueDate('')}
            />

            <PrimaryButton

              label={savingEdit ? 'Saving…' : 'Save changes'}

              onPress={() => void handleSaveEdit()}

              loading={savingEdit}

            />

            <Pressable onPress={closeEdit} style={styles.modalCancel} disabled={savingEdit}>

              <Text style={styles.modalCancelText}>Cancel</Text>

            </Pressable>

          </View>

        </View>

      </Modal>

    </SafeAreaView>

  );

}



const createTasksStyles = (c: ThemeColors) =>

  StyleSheet.create({

    safe: { flex: 1, backgroundColor: c.background },

    scroll: { paddingHorizontal: 18 },

    pageTitle: { fontSize: 22, fontWeight: '800', color: c.text, marginTop: 4 },

    subtitle: { color: c.textMuted, marginBottom: 16, display: 'none' as const },

    formCard: { marginBottom: 16 },

    input: {

      borderWidth: 1,

      borderColor: c.miniBorder,

      borderRadius: radii.card,

      paddingHorizontal: 14,

      paddingVertical: 12,

      marginBottom: 12,

      fontSize: 16,

      backgroundColor: c.surface,

      color: c.text,

    },

    textArea: { minHeight: 88, textAlignVertical: 'top' },

    taskCard: { marginBottom: 12 },

    taskTitle: { fontSize: 16, fontWeight: '700', color: c.text },

    taskDesc: { marginTop: 4, color: c.textMuted, fontSize: 14 },

    taskMeta: { marginTop: 8, fontSize: 12, color: c.textSoft, textTransform: 'capitalize' },

    rowActions: { flexDirection: 'row', gap: 10, marginTop: 12 },

    actionBtn: { flex: 1 },

    editOnlyBtn: { marginTop: 12 },

    deleteLink: { marginTop: 10, color: c.errorText, fontWeight: '600' },

    muted: { color: c.textMuted, textAlign: 'center', marginTop: 12 },

    err: { color: c.errorText, marginBottom: 12 },

    modalBackdrop: {

      flex: 1,

      backgroundColor: 'rgba(0,0,0,0.45)',

      justifyContent: 'flex-end',

    },

    modalCard: {

      backgroundColor: c.surface,

      borderTopLeftRadius: 20,

      borderTopRightRadius: 20,

      padding: 22,

      paddingBottom: 32,

    },

    modalTitle: { fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 16 },

    fieldLabel: { fontSize: 13, fontWeight: '600', color: c.textMuted, marginBottom: 6 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },

    chip: {

      paddingHorizontal: 14,

      paddingVertical: 8,

      borderRadius: radii.pill,

      borderWidth: 1,

      borderColor: c.border,

      backgroundColor: c.miniBg,

    },

    chipActive: { borderColor: c.primary, backgroundColor: c.track },

    chipText: { fontSize: 13, fontWeight: '600', color: c.textMuted },

    chipTextActive: { color: c.text },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.miniBg,
    },
    filterChipActive: { borderColor: c.primary, backgroundColor: c.track },
    filterText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    filterTextActive: { color: c.text },
    modalCancel: { marginTop: 14, alignSelf: 'center', padding: 10 },

    modalCancelText: { color: c.link, fontWeight: '700', fontSize: 15 },

  });

