import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const EMAIL = "privacy@skidki.app";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <Text style={styles.para}>{children}</Text>;
}

export default function PrivacyScreen() {
  const handleEmail = () => {
    Linking.openURL(`mailto:${EMAIL}`);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Политика конфиденциальности</Text>
            <Text style={styles.subtitle}>
              Приложение «Скидос» · Последнее обновление: 30 мая 2026 г.
            </Text>
          </View>

          {/* 1 */}
          <Section title="1. Общие положения">
            <Para>
              Настоящая Политика определяет порядок сбора, хранения, обработки,
              использования и защиты персональных данных пользователей мобильного
              приложения «Скидос». Используя Приложение, вы подтверждаете согласие
              с условиями данной Политики. Политика разработана в соответствии
              с ФЗ от 27.07.2006 № 152-ФЗ «О персональных данных», требованиями
              Apple App Store Review Guidelines и Google Play Developer Policy.
            </Para>
          </Section>

          {/* 2 */}
          <Section title="2. Оператор данных">
            <Para>
              По всем вопросам, связанным с обработкой персональных данных, вы
              можете обратиться по email:{" "}
              <Text style={styles.link} onPress={handleEmail}>
                {EMAIL}
              </Text>
            </Para>
          </Section>

          {/* 3 */}
          <Section title="3. Какие данные мы собираем">
            <Text style={styles.subheading}>Данные при регистрации</Text>
            <Para>
              Имя, email, пароль (хранится в зашифрованном виде), выбранный город
              и регион.
            </Para>

            <Text style={styles.subheading}>Данные при использовании</Text>
            <Para>
              Публикации скидок, лайки, комментарии, подписки на категории,
              просмотры контента.
            </Para>

            <Text style={styles.subheading}>Технические данные</Text>
            <Para>
              Идентификатор устройства для push-уведомлений, тип устройства
              (iOS/Android), IP-адрес.
            </Para>

            <Text style={styles.subheading}>Данные, которые НЕ собираем</Text>
            <Para>
              Контакты телефонной книги, SMS, банковские и платёжные данные,
              точное местоположение (GPS) без явного согласия, биометрические
              данные.
            </Para>
          </Section>

          {/* 4 */}
          <Section title="4. Цели обработки">
            <Para>
              Создание и ведение аккаунта, отображение скидок по выбранному
              городу, отправка push-уведомлений, обеспечение работы функций
              Приложения (лайки, комментарии, сохранения), модерация контента,
              улучшение качества сервиса.
            </Para>
          </Section>

          {/* 5 */}
          <Section title="5. Хранение и защита">
            <Para>
              Данные хранятся на серверах, расположенных на территории Российской
              Федерации. Пароли хешируются с использованием алгоритма bcrypt. Все
              данные передаются по защищённому протоколу HTTPS (TLS 1.2 и выше).
            </Para>
          </Section>

          {/* 6 */}
          <Section title="6. Передача третьим лицам">
            <Para>
              Мы НЕ продаём и НЕ передаём ваши персональные данные третьим лицам
              в маркетинговых целях. Данные могут передаваться только:
              хостинг-провайдеру для обеспечения работы серверов, сервису
              Expo Push Notification Service (только push-токен и текст
              уведомления), а также по официальному требованию законодательства РФ.
            </Para>
          </Section>

          {/* 7 */}
          <Section title="7. Push-уведомления">
            <Para>
              Push-уведомления отправляются только с вашего согласия. Вы можете
              управлять настройками уведомлений в профиле Приложения, а также
              полностью отключить их в любой момент.
            </Para>
          </Section>

          {/* 8 */}
          <Section title="8. Права пользователя">
            <Para>
              Вы имеете право: запросить доступ к вашим данным, потребовать
              исправления неточных данных, полностью и безвозвратно удалить
              аккаунт со всеми данными, отозвать согласие на обработку данных.
            </Para>
          </Section>

          {/* 9 */}
          <Section title="9. Использование без регистрации">
            <Para>
              Просмотр скидок доступен без регистрации. В гостевом режиме
              персональные данные не собираются. Выбранный город хранится
              локально на устройстве и не передаётся на сервер.
            </Para>
          </Section>

          {/* 10 */}
          <Section title="10. Cookie и аналитика">
            <Para>
              Мы НЕ используем сторонние аналитические сервисы, рекламные SDK
              и трекинг-инструменты.
            </Para>
          </Section>

          {/* 11 */}
          <Section title="11. Возрастные ограничения">
            <Para>
              Приложение предназначено для пользователей старше 12 лет.
            </Para>
          </Section>

          {/* 12 */}
          <Section title="12. Изменения политики">
            <Para>
              При существенных изменениях Политики мы уведомим вас через
              push-уведомление.
            </Para>
          </Section>

          {/* 13 */}
          <Section title="13. Обратная связь">
            <Para>
              По любым вопросам, связанным с Политикой конфиденциальности,
              пишите на{" "}
              <Text style={styles.link} onPress={handleEmail}>
                {EMAIL}
              </Text>
              . Мы ответим в течение 30 дней.
            </Para>
          </Section>

          <View style={styles.bottom} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginTop: 10,
    marginBottom: 4,
  },
  para: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  link: {
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  bottom: { height: 60 },
});
